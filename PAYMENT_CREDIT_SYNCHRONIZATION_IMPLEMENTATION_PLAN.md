# Payment and Credit System Synchronization Implementation Plan

## Overview
This document outlines the implementation plan to ensure seamless synchronization between the payment and credit systems, particularly focusing on how credits are tracked, deducted, and managed across payment cycles.

## Current System Analysis

### Credit Deduction Workflow
Based on the code analysis, the current system works as follows:

1. **Credit Request Processing**:
   - When farmers make credit requests, the system creates credit transactions
   - Approved credit requests become "active" transactions
   - Active transactions contribute to the farmer's `pending_deductions` calculation

2. **Payment Processing**:
   - When payments are made, the system reduces `pending_deductions` in `farmer_credit_profiles`
   - A "credit_repaid" transaction is created to record the deduction
   - The `pending_deductions` field is updated to reflect the reduced amount

3. **Status Management**:
   - Credit transactions with "active" status contribute to pending deductions
   - Credit transactions with "paid" status are excluded from pending deductions
   - Monthly settlements reset credit cycles

## Implementation Requirements

### Requirement 1: Credit Request Handling
When farmers make credit requests:
- Credit transactions should be created with "active" status
- Farmer's `pending_deductions` should be updated immediately
- System should validate that the request doesn't exceed available credit

### Requirement 2: Payment Deduction Processing
When payments are made via "markAsPaid" button:
- System should identify all "active" credit transactions for the farmer
- Deduct appropriate amounts from `pending_deductions`
- Update credit transaction statuses from "active" to "paid"
- Create audit trail of all deductions

### Requirement 3: Month-End Transition Handling
At month-end:
- System should distinguish between credits paid in current month vs. pending for next month
- Maintain proper tracking of which credits belong to which payment cycle
- Ensure new month starts with clean slate for new credits while preserving ongoing obligations

## Detailed Implementation Plan

### Phase 1: Credit Request Processing Enhancement

#### Task 1.1: Update Credit Request Approval Logic
```javascript
// When approving credit requests, ensure:
// 1. Credit transaction is created with "active" status
// 2. Farmer's pending_deductions is updated
// 3. Proper validation is performed

static async approveCreditRequest(requestId: string, approvedBy: string) {
  try {
    // Get the credit request
    const { data: request, error: requestError } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!request) throw new Error('Credit request not found');

    // Update request status to approved
    const { error: updateError } = await supabase
      .from('credit_requests')
      .update({ 
        status: 'approved',
        processed_by: approvedBy,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Create active credit transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        farmer_id: request.farmer_id,
        transaction_type: 'credit_used',
        amount: request.total_amount,
        status: 'active', // Important: Set to active status
        product_id: request.product_id,
        product_name: request.product_name,
        quantity: request.quantity,
        unit_price: request.unit_price,
        reference_id: requestId,
        description: `Credit used for ${request.product_name}`,
        approved_by: approvedBy,
        approval_status: 'approved'
      });

    if (transactionError) throw transactionError;

    // Update farmer's pending deductions
    await this.updatePendingDeductions(request.farmer_id);

    return { success: true };
  } catch (error) {
    logger.errorWithContext('CreditService - approveCreditRequest', error);
    return { success: false, error };
  }
}
```

#### Task 1.2: Implement Pending Deductions Calculation
```javascript
// Ensure pending deductions are calculated correctly based on active transactions
static async updatePendingDeductions(farmerId: string): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    logger.info(`PaymentProcessingService - updating pending deductions for farmer`, { farmerId });

    // Get all active credit transactions for this farmer
    const { data: activeTransactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('amount')
      .eq('farmer_id', farmerId)
      .eq('status', 'active'); // Only active transactions contribute to pending deductions

    if (transactionsError) {
      logger.errorWithContext('PaymentProcessingService - fetching active transactions', transactionsError);
      return { success: false, errorMessage: 'Failed to fetch active transactions' };
    }

    // Calculate total pending deductions
    const totalPendingDeductions = activeTransactions?.reduce((sum, transaction) => 
      sum + (transaction.amount || 0), 0) || 0;

    // Update the farmer's credit profile
    const { error: profileUpdateError } = await supabase
      .from('farmer_credit_profiles')
      .update({ 
        pending_deductions: totalPendingDeductions,
        updated_at: new Date().toISOString()
      })
      .eq('farmer_id', farmerId);

    if (profileUpdateError) {
      logger.errorWithContext('PaymentProcessingService - updating farmer credit profile', profileUpdateError);
      return { success: false, errorMessage: 'Failed to update farmer credit profile' };
    }

    logger.info(`PaymentProcessingService - pending deductions updated successfully`, { 
      farmerId, 
      totalPendingDeductions 
    });

    return { success: true };
  } catch (error) {
    logger.errorWithContext('PaymentProcessingService - updatePendingDeductions', error);
    return { success: false, errorMessage: (error as Error).message };
  }
}
```

### Phase 2: Payment Deduction Processing Enhancement

#### Task 2.1: Enhanced Mark As Paid Function
```javascript
// Enhanced markAsPaid function that properly handles credit deductions
static async markPaymentAsPaid(paymentId: string, paidBy?: string): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    // Get payment details
    const { data: paymentData, error: paymentError } = await supabase
      .from('farmer_payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (paymentError) {
      logger.errorWithContext('PaymentService - fetching payment data', paymentError);
      throw paymentError;
    }

    if (!paymentData) {
      throw new Error('Payment not found');
    }

    const farmerId = paymentData.farmer_id;
    const totalAmount = paymentData.total_amount;

    // Get staff ID from user ID
    let staffId = null;
    if (paidBy) {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', paidBy)
        .maybeSingle();
        
      if (staffError) {
        logger.errorWithContext('PaymentService - fetching staff data', staffError);
        throw staffError;
      }
      
      staffId = staffData?.id || null;
    }

    // Calculate credit deduction for this payment
    const creditInfo = await CreditService.calculateAvailableCredit(farmerId);
    const creditUsed = Math.min(creditInfo.availableCredit, totalAmount);
    
    // Calculate other deductions
    const totalDeductions = await deductionService.calculateTotalDeductionsForFarmer(farmerId);
    const netPayment = totalAmount - creditUsed - totalDeductions;

    // Update payment record
    const { data, error } = await supabase
      .from('farmer_payments')
      .update({
        approval_status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by: staffId,
        credit_used: creditUsed,
        deductions_used: totalDeductions,
        net_payment: netPayment
      })
      .eq('id', paymentId)
      .select()
      .limit(1);

    if (error) {
      logger.errorWithContext('PaymentService - marking payment as paid', error);
      throw error;
    }

    // If credit was used, update the farmer's credit profile and transactions
    if (creditUsed > 0) {
      await this.processCreditDeduction(farmerId, creditUsed, paymentId);
    }

    return { success: true, data };
  } catch (error) {
    logger.errorWithContext('PaymentService - markPaymentAsPaid', error);
    return { success: false, error };
  }
}

// Process credit deduction when payment is made
static async processCreditDeduction(farmerId: string, creditUsed: number, referenceId: string) {
  try {
    // Get current credit profile record
    const { data: creditProfileData, error: creditProfileError } = await supabase
      .from('farmer_credit_profiles')
      .select('*')
      .eq('farmer_id', farmerId)
      .eq('is_frozen', false)
      .maybeSingle();

    if (creditProfileError) {
      logger.errorWithContext('PaymentService - fetching credit profile', creditProfileError);
      throw creditProfileError;
    }

    if (creditProfileData) {
      const creditProfileRecord = creditProfileData as any;
      
      // When a payment is made, we reduce the pending deductions
      // This is how credit is "repaid" - by reducing the pending deductions
      const newPendingDeductions = Math.max(0, creditProfileRecord.pending_deductions - creditUsed);

      // Update credit profile
      const { error: updateError } = await supabase
        .from('farmer_credit_profiles')
        .update({
          pending_deductions: newPendingDeductions,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditProfileRecord.id);

      if (updateError) {
        logger.errorWithContext('PaymentService - updating credit profile', updateError);
        throw updateError;
      }

      // Create credit transaction record for the deduction
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert([{
          farmer_id: farmerId,
          transaction_type: 'credit_repaid',
          amount: creditUsed,
          balance_before: creditProfileRecord.pending_deductions,
          balance_after: newPendingDeductions,
          reference_id: referenceId,
          reference_type: 'payment_deduction',
          description: `Credit deduction from payment of KES ${creditUsed.toFixed(2)}`
        }]);

      if (transactionError) {
        logger.warn('Warning: Failed to create credit deduction transaction', transactionError);
      }

      // Update individual credit transactions from active to paid based on amount
      await this.markCreditTransactionsAsPaid(farmerId, creditUsed);
    }
  } catch (error) {
    logger.errorWithContext('PaymentService - processCreditDeduction', error);
    throw error;
  }
}

// Mark individual credit transactions as paid
static async markCreditTransactionsAsPaid(farmerId: string, amountToDeduct: number) {
  try {
    // Get all active credit transactions for this farmer, ordered by creation date
    const { data: activeTransactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('farmer_id', farmerId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (transactionsError) {
      logger.errorWithContext('PaymentService - fetching active transactions', transactionsError);
      throw transactionsError;
    }

    let remainingAmount = amountToDeduct;

    // Process transactions in order until amount is fully deducted
    for (const transaction of activeTransactions || []) {
      if (remainingAmount <= 0) break;

      const deductionAmount = Math.min(transaction.amount, remainingAmount);
      
      // Update transaction status to paid
      const { error: updateError } = await supabase
        .from('credit_transactions')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateError) {
        logger.warn(`Failed to update transaction ${transaction.id} to paid status`, updateError);
        continue;
      }

      remainingAmount -= deductionAmount;
    }

    // Update pending deductions calculation
    await PaymentProcessingService.updatePendingDeductions(farmerId);
  } catch (error) {
    logger.errorWithContext('PaymentService - markCreditTransactionsAsPaid', error);
    throw error;
  }
}
```

### Phase 3: Month-End Transition Handling

#### Task 3.1: Monthly Settlement Process Enhancement
```javascript
// Enhanced monthly settlement that properly handles payment cycle transitions
static async performMonthlySettlement(farmerId: string, settledBy?: string): Promise<boolean> {
  try {
    // Get farmer's credit profile
    const { data: creditProfile, error: profileError } = await supabase
      .from('farmer_credit_profiles')
      .select('*')
      .eq('farmer_id', farmerId)
      .maybeSingle();

    if (profileError) {
      logger.errorWithContext('CreditService - fetching credit profile for settlement', profileError);
      throw profileError;
    }

    if (!creditProfile) {
      throw new Error('Credit profile not found for farmer');
    }

    const profile = creditProfile as FarmerCreditProfile;

    // Important: Only reset credit balance, not pending deductions
    // Pending deductions for active transactions should persist to next month
    const { error: updateError } = await supabase
      .from('farmer_credit_profiles')
      .update({
        current_credit_balance: profile.max_credit_amount,
        last_settlement_date: new Date().toISOString().split('T')[0],
        next_settlement_date: this.calculateNextSettlementDate(),
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (updateError) {
      logger.errorWithContext('CreditService - updating credit profile for settlement', updateError);
      throw updateError;
    }

    // Convert user ID to staff ID if provided
    let staffId = null;
    if (settledBy) {
      try {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', settledBy)
          .maybeSingle();
        
        if (!staffError && staffData) {
          staffId = staffData.id;
        }
      } catch (staffLookupError) {
        logger.errorWithContext('CreditService - fetching staff record for settlement', staffLookupError);
      }
    }

    // Create settlement transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        farmer_id: farmerId,
        transaction_type: 'settlement',
        amount: profile.pending_deductions,
        balance_before: profile.current_credit_balance,
        balance_after: profile.max_credit_amount,
        description: `Monthly settlement completed. KES ${(profile.pending_deductions || 0).toFixed(2)} pending for deduction from future payments.`,
        approved_by: staffId,
        approval_status: 'approved'
      })
      .select();

    if (transactionError) {
      logger.errorWithContext('CreditService - creating settlement transaction', transactionError);
      throw transactionError;
    }

    return true;
  } catch (error) {
    logger.errorWithContext('CreditService - performMonthlySettlement', error);
    throw error;
  }
}

// Helper to calculate next settlement date
static calculateNextSettlementDate(): string {
  const today = new Date();
  const settlementDay = 25; // Default settlement day
  
  let nextSettlement = new Date(today.getFullYear(), today.getMonth() + 1, settlementDay);
  
  // If we've passed the settlement day this month, move to next month
  if (today.getDate() > settlementDay) {
    nextSettlement = new Date(today.getFullYear(), today.getMonth() + 1, settlementDay);
  }
  
  return nextSettlement.toISOString().split('T')[0];
}
```

### Phase 4: Audit Trail and Monitoring

#### Task 4.1: Enhanced Logging and Auditing
```javascript
// Enhanced logging for credit and payment operations
class CreditPaymentAuditService {
  static async logCreditOperation(operation: string, farmerId: string, details: any) {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'credit_payment_integration',
          operation: operation,
          changed_by: details.changed_by || null,
          old_data: details.old_data || {},
          new_data: details.new_data || {},
          record_id: farmerId,
          changed_at: new Date().toISOString()
        });

      if (error) {
        logger.warn('Failed to log credit operation', error);
      }
    } catch (error) {
      logger.errorWithContext('CreditPaymentAuditService - logCreditOperation', error);
    }
  }

  static async generateCreditPaymentReport(startDate: string, endDate: string) {
    try {
      // Get all credit transactions in the period
      const { data: creditTransactions, error: creditError } = await supabase
        .from('credit_transactions')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', `${endDate}T23:59:59`);

      if (creditError) throw creditError;

      // Get all payment records in the period
      const { data: payments, error: paymentError } = await supabase
        .from('farmer_payments')
        .select('*')
        .gte('paid_at', startDate)
        .lte('paid_at', `${endDate}T23:59:59`)
        .eq('approval_status', 'paid');

      if (paymentError) throw paymentError;

      // Generate reconciliation report
      const report = {
        period: { start: startDate, end: endDate },
        totalCreditsUsed: creditTransactions
          ?.filter(t => t.transaction_type === 'credit_used')
          .reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        totalCreditsRepaid: creditTransactions
          ?.filter(t => t.transaction_type === 'credit_repaid')
          .reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        totalPaymentsProcessed: payments?.length || 0,
        totalPaymentAmount: payments?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0,
        totalCreditDeductions: payments?.reduce((sum, p) => sum + (p.credit_used || 0), 0) || 0
      };

      return report;
    } catch (error) {
      logger.errorWithContext('CreditPaymentAuditService - generateCreditPaymentReport', error);
      throw error;
    }
  }
}
```

## Testing Plan

### Test Case 1: Credit Request Processing
1. Farmer submits credit request
2. Admin approves request
3. Verify credit transaction is created with "active" status
4. Verify farmer's `pending_deductions` is updated
5. Verify credit appears in farmer's dashboard

### Test Case 2: Payment Deduction Processing
1. Farmer has active credit transactions
2. Admin clicks "markAsPaid" for a payment
3. Verify `pending_deductions` is reduced appropriately
4. Verify credit transactions are updated from "active" to "paid"
5. Verify audit trail is created

### Test Case 3: Month-End Transition
1. Farmer has active credit transactions at month-end
2. Monthly settlement is triggered
3. Verify credit balance is reset but pending deductions persist
4. Verify settlement transaction is created
5. Verify next month correctly handles existing obligations

### Test Case 4: Multi-Cycle Credit Management
1. Farmer uses credit in Month 1
2. Partial payment is made in Month 1
3. Remaining credit carries over to Month 2
4. Full payment is made in Month 2
5. Verify proper tracking across both months

## Implementation Timeline

### Week 1: Core Logic Implementation
- Implement enhanced credit request processing
- Implement enhanced payment deduction processing
- Implement month-end transition handling

### Week 2: Testing and Validation
- Conduct unit testing of all new functions
- Perform integration testing with existing systems
- Validate audit trail and reporting functionality

### Week 3: Deployment and Monitoring
- Deploy to staging environment
- Conduct user acceptance testing
- Monitor system performance and error rates

### Week 4: Production Deployment
- Deploy to production environment
- Provide training to admin users
- Establish monitoring and alerting

## Success Metrics

1. **Accuracy**: 100% accuracy in credit deduction calculations
2. **Performance**: Payment processing completes within 5 seconds
3. **Reliability**: 99.9% uptime for credit/payment operations
4. **Audit Trail**: 100% of transactions have proper audit records
5. **User Satisfaction**: 90%+ user satisfaction rating for credit management features

## Risk Mitigation

1. **Data Loss Prevention**: Implement comprehensive backup procedures
2. **Performance Degradation**: Monitor system performance and optimize queries
3. **User Errors**: Implement validation and error handling at all entry points
4. **Security**: Ensure proper authentication and authorization for all operations
5. **Rollback Procedures**: Maintain ability to rollback changes if issues arise

This implementation plan ensures that the payment and credit systems work seamlessly together, with proper tracking of credits across payment cycles and accurate deduction processing.