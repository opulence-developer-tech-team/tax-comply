import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useForm } from "@/hooks/useForm";
import { useHttp } from "@/hooks/useHttp";
import { HttpMethod } from "@/lib/utils/http-method";
import { Save } from "lucide-react";

export function ChangePasswordForm() {
  const { isLoading, sendHttpRequest: changePasswordReq } = useHttp();

  const { values, errors, touched, handleChange, handleBlur, validate } = useForm(
    {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    {
      currentPassword: {
        required: true,
      },
      newPassword: {
        required: true,
        minLength: 8,
        custom: (value) => {
          if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
            return "Password must contain at least 1 uppercase, 1 lowercase, and 1 number";
          }
          return null;
        },
      },
      confirmPassword: {
        required: true,
        custom: (value) => {
          if (value !== values.newPassword) {
            return "Passwords do not match";
          }
          return null;
        },
      },
    }
  );

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    changePasswordReq({
      successRes: () => {},
      requestConfig: {
        url: "/user/change-password",
        method: HttpMethod.POST,
        body: {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
        successMessage: "Password changed successfully",
      },
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      onSubmit={handlePasswordChange}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <PasswordInput
          label="Current Password"
          required
          placeholder="Enter current password"
          value={values.currentPassword}
          onChange={handleChange("currentPassword")}
          onBlur={handleBlur("currentPassword")}
          error={touched.currentPassword ? errors.currentPassword : undefined}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <PasswordInput
          label="New Password"
          required
          placeholder="Enter new password"
          value={values.newPassword}
          onChange={handleChange("newPassword")}
          onBlur={handleBlur("newPassword")}
          error={touched.newPassword ? errors.newPassword : undefined}
          helperText="At least 8 characters with uppercase, lowercase, and number"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <PasswordInput
          label="Confirm New Password"
          required
          placeholder="Confirm new password"
          value={values.confirmPassword}
          onChange={handleChange("confirmPassword")}
          onBlur={handleBlur("confirmPassword")}
          error={touched.confirmPassword ? errors.confirmPassword : undefined}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="flex justify-end pt-4 border-t border-slate-100"
      >
        <Button 
          type="submit" 
          loading={isLoading} 
          disabled={isLoading}
          className="min-w-[160px]"
        >
          <Save className="w-4 h-4" />
          Change Password
        </Button>
      </motion.div>
    </motion.form>
  );
}