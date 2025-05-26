import RegisterForm from "@/components/auth/RegisterForm";
import { Card } from "@/components/ui/card";

const Register = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full ">
        <div className="text-center">
          <img
            src="https://wnywlwahimhlfnxmwhsu.supabase.co/storage/v1/object/public/images//Roster%20Logo.png"
            alt="Build with Roster Logo"
            className="w-100 "
          />
        </div>
        <Card className="p-6 shadow-lg border-t-4 border-t-[#A74D4A]">
          <RegisterForm />
        </Card>
      </div>
    </div>
  );
};

export default Register;
