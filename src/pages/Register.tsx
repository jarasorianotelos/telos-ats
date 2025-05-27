import RegisterForm from "@/components/auth/RegisterForm";
import { Card } from "@/components/ui/card";

const Register = () => {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(131deg, #0085ca 0%, #001a70 99%)' }}>
      <div className="max-w-md w-full ">
        <div className="text-center pb-10">
          <img
            src="https://usobbytqipduqxqqxuit.supabase.co/storage/v1/object/public/images//logo.png"
            alt="Build with Roster Logo"
            className="w-100 "
          />
        </div>
        <Card className="p-6 shadow-lg border-t-4 border-t-[#0085ca]">
          <RegisterForm />
        </Card>
      </div>
    </div>
  );
};

export default Register;
