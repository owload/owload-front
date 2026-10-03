import { Button } from '@/components/ui/button'
import { NavBar } from './components/NavBar'
import { useLogin, useRegister } from '@/auth-context-provider';

export function Landing() {
  const login = useLogin();
  const register = useRegister();

  return (
    <>
      <div className="md:px-20 2xs:h-screen min-h-180 2xs:max-h-230 lg:max-h-screen xs:h-auto lg:h-[90vh] xl:h-screen bg-linear-to-b from-primary to-primary-foreground via-[#FFE974] via-64%">

        <NavBar />

        {/* main landing block */}
        <div className='lg:h-full flex 2xs:flex-col lg:flex-row items-center'>
          {/* left/top side */}
          <div className='flex-1 2xs:mb-10 xs:mb-15 lg:p-10 lg:pr-0 xl:p-20 px-5 2xs:pt-10 lg:pt-20 lg:pb-20'>
            <p className='2xs:text-4xl xs:text-5xl xl:text-6xl font-extrabold font-montserrat'>Cloud file storage with encryption you can verify</p>
            <p className='2xs:mt-2 xs:mt-5 lg:mt-12'>Privacy and safety of your data are the focal points</p>
            <div className='2xs:mt-8 xs:mt-8'>
              <Button variant={'black'} size={'lg'} className='px-14 2xs:w-full lg:w-auto 2xs:mb-3' onClick={() => register()}>Start free</Button>
              <Button variant={'outline'} size={'lg'} className='2xs:hidden lg:inline lg:ml-6 2xs:w-full lg:w-auto border-black'>Choose version</Button>
              <Button variant={'outline'} size={'lg'} className='lg:hidden lg:ml-6 2xs:w-full lg:w-auto border-black' onClick={() => login()}>Already registered? Sign in</Button>
            </div>
          </div>

          {/* right/bottom side */}
          <div className="flex-1 min-w-0 min-h-0 flex items-end justify-center px-6 lg:px-20 lg:py-20">
            <img
              src="/landing-illustration-man.svg"
              className="w-full 2xs:max-w-70 xs:max-w-110 lg:max-w-full h-auto"
              alt="Landing illustration"
            />
          </div>

        </div>
      </div>

      <div className="bg-primary-foreground h-[calc(110vh)] flex items-center justify-center bg-[url(/bg-pattern.svg)]">

        {/* <div className='relative group h-190 w-295'>
          <div className="absolute h-190 w-295 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-lg blur opacity-25 group-hover:opacity-35 transition duration-1000 group-hover:duration-200"></div>
          <video src="/demo.mov" className='absolute h-170 m-10' autoPlay muted loop></video>
        </div> */}

      </div>
      <div className='h-40 bg-linear-to-b from-primary-foreground to-primary'></div>
      <div className="bg-primary flex flex-col items-center justify-center h-screen">
        asdf
      </div>
    </>
  )
}
