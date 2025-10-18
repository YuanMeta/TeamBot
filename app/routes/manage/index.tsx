import { redirect } from 'react-router'

export async function loader() {
  return redirect('/manage/assistant')
}

export default function ManageIndex() {
  return null
}
