import { Button } from '~/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { observer } from 'mobx-react-lite'

export default observer(() => {
  return (
    <div className={'login-page dark'}>
      <div className={'stars'}></div>
      <div className={'stars2'}></div>
      <div className={'stars3'}></div>
      <div className={'flex flex-col items-center justify-center h-full'}>
        <div className={'-mt-36'}>
          <div className={'title mb-5'}>
            <span>Team Bot</span>
          </div>
          <Card className='w-96 max-w-sm'>
            <CardHeader>
              <CardTitle>登录到你的账户</CardTitle>
              <CardDescription>
                输入你的邮箱或用户名来登录你的账户
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form>
                <div className='flex flex-col gap-6'>
                  <div className='grid gap-2'>
                    <Label htmlFor='email'>用户名或邮箱</Label>
                    <Input
                      id='email'
                      type='email'
                      placeholder='m@example.com'
                      required
                    />
                  </div>
                  <div className='grid gap-2'>
                    <div className='flex items-center'>
                      <Label htmlFor='password'>Password</Label>
                    </div>
                    <Input id='password' type='password' required />
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className='flex-col gap-2'>
              <Button type='submit' className='w-full'>
                登录
              </Button>
              <Button variant='outline' className='w-full'>
                通过Google登录
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
})
