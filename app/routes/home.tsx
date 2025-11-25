import { redirect } from 'react-router'
export function loader() {
  return redirect('/chat')
}

export default function Home() {
  return null
}
