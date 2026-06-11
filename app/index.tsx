import { Redirect } from 'expo-router';

/**
 * Root index — always redirect to splash screen on app start / refresh.
 * Flow: splash → login → (tabs) dashboard
 */
export default function Index() {
  return <Redirect href="/splash" />;
}
