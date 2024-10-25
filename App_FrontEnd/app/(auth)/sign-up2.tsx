import { ScrollView, Text, View } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../components/CustomButton";
import FormField from "../../components/FormField";
import { Link, useRouter, useLocalSearchParams } from "expo-router";

const SignUp2 = () => {
  const router = useRouter();
  const { username, email } = useLocalSearchParams();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });

  const validatePassword = (password: string) => {
    const trimmedPassword = password.trim();

    // Check for whitespace
    if (/\s/.test(trimmedPassword)) {
      return "Password must not contain whitespace.";
    }

    if (trimmedPassword.length < 6) {
      return "Password must be at least 6 characters long.";
    }
    if (trimmedPassword.length > 30) {
      return "Password must not exceed 30 characters.";
    }

    return ""; // No warning
  };

  const submit = () => {
    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    console.log(form.password)
    console.log(username)
    console.log(email)

    // Proceed to the next step (e.g., send data to API)
    router.push({
      pathname: "/sign-up3",
      params: { username, email, password: form.password },
    });
  };

  const isFormValid =
    form.password.length >= 6 &&
    form.password.length <= 30 &&
    form.password === form.confirmPassword &&
    !/\s/.test(form.password);

  return (
    <SafeAreaView className="h-full bg-black-200">
      <ScrollView contentContainerStyle={{ height: "100%" }} keyboardShouldPersistTaps="handled">
        <View className="w-full h-full justify-center px-4 my-8">
          <Text className="text-4xl text-secondary-300 font-spotifymixuititle">
            Set Your Password
          </Text>

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e: any) => setForm({ ...form, password: e })}
            warning={form.password.length > 0 ? validatePassword(form.password) : ""}
            otherStyles="mt-5"
            autoCapitalize="none" placeholder={undefined} keyboardType={undefined}/>

          <FormField
            title="Confirm Password"
            value={form.confirmPassword}
            handleChangeText={(e: any) => setForm({ ...form, confirmPassword: e })}
            warning={form.confirmPassword.length > 0 && form.password !== form.confirmPassword
              ? "Passwords do not match."
              : ""}
            otherStyles="mt-5"
            autoCapitalize="none" placeholder={undefined} keyboardType={undefined}/>

          <View className="justify-center pt-7 flex-row gap-2">
            <CustomButton
              title="Next"
              handlePress={submit}
              containerStyles="mt-10 w-1/2 rounded-full"
              disabled={!isFormValid} textStyles={undefined} isLoading={undefined} background={undefined}/>
          </View>

          <View className="justify-center pt-7 flex-row gap-2">
            <Text className="text-lg text-secondary-300 font-spotifymixuititlevar">
              Already have an account?
            </Text>
            <Link
              href="/sign-in"
              className="text-lg text-primary font-spotifymixuititlevar"
            >
              Sign In
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp2;
