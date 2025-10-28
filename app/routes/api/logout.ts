import { userCookie } from '~/.server/session'

export async function action() {
  return Response.json(
    {
      success: true
    },
    {
      headers: {
        'Set-Cookie': await userCookie.serialize('', {
          maxAge: 0
        })
      }
    }
  )
}
