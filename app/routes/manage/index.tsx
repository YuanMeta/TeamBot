import { redirect } from 'react-router'

export async function loader() {
  return redirect('/manage/provider')
}

export default function ManageIndex() {
  return null
}
