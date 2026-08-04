import { AtlasLoader } from "@/shared/ui";
import { useToast } from "@atlas/ui";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth-provider.tsx";

export function VerifyEmailView() {
  const { verifyEmail, retry, status } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startedRef = useRef(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const token = searchParams.get("token") ?? "";
    if (!token) {
      toast("This verification link is missing its token.", "error");
      navigate("/", { replace: true });
      return;
    }

    verifyEmail(token)
      .then(async () => {
        toast("Your email is verified.", "success");
        await retry();
        setVerified(true);
      })
      .catch((caught: unknown) => {
        toast(caught instanceof Error ? caught.message : "Verification failed.", "error");
        navigate("/", { replace: true });
      });
  }, [verifyEmail, retry, toast, navigate, searchParams]);

  useEffect(() => {
    if (!verified || status === "loading") return;
    navigate(status === "authenticated" ? "/app" : "/login", { replace: true });
  }, [verified, status, navigate]);

  return <AtlasLoader />;
}
