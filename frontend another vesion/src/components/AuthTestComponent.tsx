import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testDummyLogin, testRegularLogin, testAuthStatus } from '@/utils/authTestUtils';
import { testRefreshToken, testLogout, testAuthMe } from '@/utils/refreshTokenTest';
import { testDummyLoginFormats } from '@/utils/dummyLoginTest';

const AuthTestComponent: React.FC = () => {
  const [credentials, setCredentials] = useState({ username: 'admin@cheradairy.com', password: 'CheraDairy2025!' });
  const [testResults, setTestResults] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const testDummyLoginFlow = async () => {
    addResult('Testing dummy login...');
    const success = await testDummyLogin(credentials.username, credentials.password);
    addResult(`Dummy login ${success ? 'SUCCESS' : 'FAILED'}`);
  };

  const testRegularLoginFlow = async () => {
    addResult('Testing regular login...');
    const success = await testRegularLogin(credentials.username, credentials.password);
    addResult(`Regular login ${success ? 'SUCCESS' : 'FAILED'}`);
  };

  const testAuthStatusFlow = async () => {
    addResult('Testing auth status...');
    const success = await testAuthStatus();
    addResult(`Auth status ${success ? 'SUCCESS' : 'FAILED'}`);
  };

  const testRefreshTokenFlow = async () => {
    addResult('Testing refresh token...');
    const success = await testRefreshToken();
    addResult(`Refresh token ${success ? 'SUCCESS' : 'FAILED'}`);
  };

  const testLogoutFlow = async () => {
    addResult('Testing logout...');
    const success = await testLogout();
    addResult(`Logout ${success ? 'SUCCESS' : 'FAILED'}`);
  };

  const testAuthMeFlow = async () => {
    addResult('Testing auth/me...');
    const success = await testAuthMe();
    addResult(`Auth/me ${success ? 'SUCCESS' : 'FAILED'}`);
  };

  const testDummyLoginFormatsFlow = async () => {
    addResult('Testing dummy login formats...');
    await testDummyLoginFormats(credentials.username, credentials.password);
    addResult('Dummy login formats test completed - check console for details');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Authentication Test Component</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                placeholder="Username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input
                name="password"
                type="password"
                value={credentials.password}
                onChange={handleInputChange}
                placeholder="Password"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={testDummyLoginFlow}>Test Dummy Login</Button>
            <Button onClick={testRegularLoginFlow}>Test Regular Login</Button>
            <Button onClick={testAuthStatusFlow}>Test Auth Status</Button>
            <Button onClick={testRefreshTokenFlow}>Test Refresh Token</Button>
            <Button onClick={testAuthMeFlow}>Test Auth/Me</Button>
            <Button onClick={testLogoutFlow}>Test Logout</Button>
            <Button onClick={testDummyLoginFormatsFlow}>Test Login Formats</Button>
            <Button onClick={clearResults} variant="outline">Clear Results</Button>
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Test Results:</h3>
            <div className="bg-gray-100 p-4 rounded-md max-h-60 overflow-y-auto">
              {testResults.length > 0 ? (
                <ul className="space-y-1">
                  {testResults.map((result, index) => (
                    <li key={index} className="font-mono text-sm">
                      {result}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No test results yet. Run a test to see results here.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthTestComponent;