import { Redirect } from 'expo-router';

export default function Index() {
  // If no auth or 0 level, we might redirect to /welcome, but for now we go straight to home
  return <Redirect href="/welcome" />;
}
