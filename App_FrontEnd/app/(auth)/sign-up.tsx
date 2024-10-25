import { ScrollView, Text, View, Image } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../../constants";
import FormField from "../../components/FormField";
import CustomButton from "../../components/CustomButton";
import { Link, useRouter } from "expo-router";
import * as SystemUI from "expo-system-ui";
import BASE_URL from '../../config.js';

SystemUI.setBackgroundColorAsync("#050505");

const SignUp = () => {
  const [form, setForm] = useState({ username: "", email: "" });
  const [usernameWarning, setUsernameWarning] = useState("");
  const [emailWarning, setEmailWarning] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

  const validateUsername = (username: string) => {
    const trimmedUsername = username.trim();
    const underscoreCount = (trimmedUsername.match(/_/g) || []).length;

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return "Username must be 3-30 characters.";
    }
    if (underscoreCount > 5) {
      return "Username can contain a maximum of 5 underscores.";
    }
    if (!usernameRegex.test(trimmedUsername)) {
      return "Username can only contain letters, numbers, and underscores.";
    }
    return "";
  };

  const validateEmail = (email: string) => {
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmedEmail) ? "" : "Please enter a valid email address.";
  };

  const checkUsernameAndEmail = async () => {
    try {
      const usernameResponse = await fetch(`${BASE_URL}/auth/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username }),
      });

      if (usernameResponse.status === 400) {
        setUsernameWarning("Username already exists!");
        return false;
      }

      const emailResponse = await fetch(`${BASE_URL}/auth/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      if (emailResponse.status === 400) {
        setEmailWarning("Email already exists!");
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "username") {
      setUsernameWarning(validateUsername(value));
    } else if (field === "email") {
      setEmailWarning(validateEmail(value));
    }
  };

  const submit = async () => {
    const usernameError = validateUsername(form.username);
    const emailError = validateEmail(form.email);
    
    setUsernameWarning(usernameError);
    setEmailWarning(emailError);

    if (usernameError || emailError) return; // Stop if errors are present

    setIsLoading(true); // Start loading state
    const isValid = await checkUsernameAndEmail();
    setIsLoading(false); // End loading state

    if (!isValid) return; // Stop if validation fails

    router.push({
      pathname: "/sign-up2",
      params: { username: form.username.trim(), email: form.email.trim() },
    });
  };

  return (
    <SafeAreaView className="h-full bg-black-200">
      <ScrollView contentContainerStyle={{ height: "100%" }} keyboardShouldPersistTaps="handled">
        <View className="w-full h-full justify-center px-4 my-8">
          <View className="flex-row items-center mb-5 mr-4">
            <Image source={images.icon} className="w-8 h-8 mr-2" />
            <Text className="text-4xl text-secondary-300 font-spotifymixuititle ">
              Sign-up to {""}
              <Text className="text-secondary ml-20">Hoot<Text className=" text-primary-200">Post</Text></Text>
            </Text>
          </View>

          <FormField
            title="Pick a Username"
            value={form.username}
            handleChangeText={(e: any) => handleChange("username", e)}
            warning={usernameWarning}
            otherStyles="mt-5"
            autoCapitalize="none" placeholder={undefined} keyboardType={undefined}/>

          <FormField
            title="Your Email Address"
            value={form.email}
            handleChangeText={(e: any) => handleChange("email", e)}
            warning={emailWarning}
            otherStyles="mt-5"
            keyboardType="email-address"
            autoCapitalize="none" placeholder={undefined}/>

          <View className="justify-center pt-7 flex-row gap-2">
            <CustomButton
              title="Next"
              handlePress={submit}
              containerStyles="mt-10 w-1/2 rounded-full "
              disabled={isLoading || !!(usernameWarning || emailWarning)} 
              textStyles={undefined} isLoading={undefined} background={undefined}/>
          </View>

          <View className="justify-center pt-7 flex-row gap-2">
            <Text className="text-lg text-secondary-300 font-spotifymixuititlevar">
              Already a User
            </Text>
            <Link
              href="/sign-in"
              className="text-lg text-primary-200 font-spotifymixuititlevar"
            >
              Sign In
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
