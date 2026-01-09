# Google Play Store Submission Guide

## Prerequisites Checklist

- [x] App configured with SDK 34
- [x] Privacy Policy created
- [x] EAS Build configured
- [ ] Google Play Console account ($25 one-time)
- [ ] App assets ready (icons, screenshots)
- [ ] Privacy Policy hosted online

---

## Step 1: Create Google Play Console Account

1. Go to: https://play.google.com/console
2. Sign in with Google account
3. Pay $25 registration fee (one-time)
4. Complete developer profile

---

## Step 2: Host Privacy Policy

**Option A: GitHub Pages (Free)**
```bash
# Create a new public GitHub repo
# Upload PRIVACY_POLICY.md
# Enable GitHub Pages in repo settings
# URL will be: https://[username].github.io/[repo]/PRIVACY_POLICY.html
```

**Option B: Google Sites (Free)**
1. Go to sites.google.com
2. Create new site
3. Paste privacy policy content
4. Publish
5. Copy URL

**Option C: Your Own Website**
- Upload to: https://yourdomain.com/privacy-policy

---

## Step 3: Prepare Store Assets

Follow `PLAY_STORE_ASSETS_GUIDE.md` to create:
- [ ] App Icon (512x512)
- [ ] Feature Graphic (1024x500)  
- [ ] 2+ Screenshots
- [ ] Store descriptions

---

## Step 4: Build AAB for Production

```bash
cd collectors-mobile-app

# Build AAB (Android App Bundle)
eas build --platform android --profile production
```

**What happens:**
- Builds optimized .aab file
- Auto-increments version code
- Takes ~15-20 minutes
- Provides download link

---

## Step 5: Create App in Play Console

1. Go to Play Console → All Apps → Create App
2. Fill in:
   - **App name:** Cow Connect Collector
   - **Default language:** English (UK) or English (US)
   - **App or game:** App
   - **Free or paid:** Free
3. Complete declarations:
   - [ ] Not a government app
   - [ ] Privacy policy: [Your hosted URL]
   - [ ] Content guidelines compliance

---

## Step 6: Complete Store Listing

### Main Store Listing Tab:

**App Details:**
- Short description (80 chars max)
- Full description (see PLAY_STORE_ASSETS_GUIDE.md)
- App icon (512x512)
- Feature graphic (1024x500)

**Screenshots:**
- Upload at least 2 phone screenshots
- Optional: tablet screenshots

**Categorization:**
- **App category:** Business or Productivity
- **Tags:** dairy, milk, collection, farming, offline

---

## Step 7: Content Rating

1. Go to: Content Rating tab
2. Start questionnaire
3. Answer questions:
   - Violence: No
   - User interaction: No
   - Location sharing: Yes → "GPS for verifying milk collection points"
   - Personal info sharing: No
   - Digital purchases: No

4. **Expected rating:** Everyone

---

## Step 8: Data Safety

Complete Data Safety form:

**Data Collected:**
- ✅ Location (approximate and precise)
  - Purpose: Collection point verification
  - Required for app functionality
- ✅ Photos
  - Purpose: Quality documentation
  - Optional
- ✅ Name and email
  - Purpose: Authentication
  - Required for app functionality

**Data Sharing:**
- Shared with: Your employer (dairy cooperative)
- Not sold to third parties

**Security:**
- Data encrypted in transit
- Data encrypted at rest

---

## Step 9: Upload AAB

1. Go to: Production → Create new release
2. Upload AAB file from EAS build
3. Add release notes:
   ```
   Initial release of Cow Connect Collector
   - Offline milk collection recording
   - GPS verification
   - Photo documentation
   - Auto-sync when online
   - Performance tracking
   ```

---

## Step 10: Review and Rollout

1. **Review summary** - Check all information
2. **Choose rollout:**
   - Internal testing (recommended first)
   - Closed testing
   - Open testing
   - Production

3. **Submit for review**
   - Google reviews in 1-3 days
   - You'll receive email notification

---

## Alternative: Automated Submission with EAS

**Setup:**
1. Create Google Service Account:
   - https://console.cloud.google.com
   - Create new project
   - Enable Google Play Developer API
   - Create service account
   - Download JSON key

2. Grant Play Console access:
   - Play Console → Users & Permissions
   - Invite service account email
   - Grant "Release to production" permission

3. Save key as `pc-api-key.json` in project root

4. Run automated submission:
   ```bash
   eas submit --platform android
   ```

**Note:** First submission must be manual. Subsequent updates can be automated.

---

## Post-Submission Checklist

- [ ] Monitor review status in Play Console
- [ ] Respond to any review feedback within 7 days
- [ ] Once approved, test download from Play Store
- [ ] Monitor crash reports in Play Console
- [ ] Set up automated updates for future releases

---

## Troubleshooting

**"App not compliant with privacy policy"**
- Ensure privacy policy URL is accessible
- Privacy policy must match app's actual data usage

**"Target SDK version too low"**
- We're using SDK 34 ✅ Should be fine

**"Missing required permissions"**
- Already configured in app.json ✅

**"Icons don't meet requirements"**
- Use exactly 512x512 PNG for app icon
- No transparency
- Test with Google's icon validator

---

## Important Links

- **Play Console:** https://play.google.com/console
- **EAS Build Dashboard:** https://expo.dev/accounts/[your-account]/projects/collectors-mobile-app
- **Asset Guidelines:** https://support.google.com/googleplay/android-developer/answer/9866151

---

## Estimated Timeline

- Asset creation: 2-4 hours
- Initial submission: 30-60 minutes
- Google review: 1-3 business days
- **Total:** 2-5 days until app is live

---

## Support

If you encounter issues:
1. Check Play Console help docs
2. Review EAS submission logs
3. Contact via Play Console support chat

Good luck with your submission! 🚀
