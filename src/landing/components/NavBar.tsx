import { useLogin, useRegister } from "@/auth-context-provider";
import { Button } from "@/components/ui/button";

export function NavBar() {
    const login = useLogin();
    const register = useRegister();

    return (
        <div className="flex items-center">
            <div className="flex-2">
                <img src='/logo-full.svg' className="2xs:ml-5 lg:ml-20 mt-4"></img>
            </div>
            <div className="2xs:hidden lg:flex flex-2 justify-stretch gap-8 mt-4">
                <a>Product</a>
                <a>Pricing</a>
                <a>Client</a>
                <a>Faq</a>
                <a>Contact</a>
            </div>
            <div className="2xs:hidden lg:flex flex-3 justify-end pr-10 pt-4">
                <Button variant={'outline'} className="border-black" onClick={() => login()}>Sing in</Button>
                <Button variant={'black'} className="ml-3" onClick={() => register()}>Sing up</Button>
            </div>
            <div className="2xs:flex 2xs:flex-1 lg:hidden justify-end pr-5">
                <div className="bg-black rounded-md w-10 h-10 px-3">
                    <div className="bg-white rounded-md w-full h-[2px] mt-4"></div>
                    <div className="bg-white rounded-md w-full h-[2px] mt-1"></div>
                </div>
            </div>
        </div>
    );
}
