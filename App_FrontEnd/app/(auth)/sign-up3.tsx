import { ScrollView, Text, View, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import FormField from "../../components/FormField";
import CustomButton from "../../components/CustomButton";
import io from "socket.io-client";
import useNetworkStatus from "../../hooks/useNetworkStatus";
import { Link, useRouter, useLocalSearchParams } from "expo-router";
import CustomDropdown from "@/components/CustomDropdown";
import BASE_URL from '../../config.js';

const registerUser = async (
  userData: {
    username: any;
    email?: string | string[];
    password: any;
    firstName?: string;
    lastName?: string;
    age?: string;
    sex?: string;
    bio?: string;
  },
  authentication: string,
  timeoutDuration: number | undefined,
  socket: { emit: (arg0: string, arg1: { username: any }) => void } | null,
  router,
  isConnected: boolean,
  setError: {
    (
      value: React.SetStateAction<{
        username: string;
        email: string;
        other: string;
      }>
    ): void;
    (arg0: {
      (prev: any): any;
      (prev: any): any;
      (prev: any): any;
      (prev: any): any;
      username?: string;
      email?: string;
      other?: string;
    }): void;
  }
) => {
  if (!isConnected) {
    Alert.alert("Network Error", "Please check your internet connection.");
    return;
  }
  setError({ username: "", email: "", other: "" });
  try {
    const fetchPromise = fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authentication}`,
      },
      credentials: "include",
      body: JSON.stringify(userData),
    });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Registration request timed out")),
        timeoutDuration
      );
    });
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    const data = await response.json();
    if (response.ok) {
      console.log("Registration success", data);
      socket.emit("user_registered", { username: userData.username });
      router.replace(
        `/sign-in?username=${encodeURIComponent(
          userData.username
        )}&password=${encodeURIComponent(userData.password)}`
      );
    } else {
      if (data.error === "Username already exists!") {
        setError((prev: any) => ({ ...prev, username: data.error }));
        Alert.alert("Username Error", data.error);
        router.replace("/sign-up");
      } else if (data.email_error === "Email already exists!") {
        setError((prev: any) => ({ ...prev, email: data.email_error }));
        Alert.alert("Email Error", data.email_error);
        router.replace("/sign-up");
      } else {
        const errorMessage =
          data.error || "Registration failed. Please try again.";
        setError((prev: any) => ({ ...prev, other: errorMessage }));
        Alert.alert("Registration Failed", errorMessage);
      }
    }
  } catch (err) {
    const errorMessage =
      err.message === "Registration request timed out"
        ? "Registration request timed out. Please try again."
        : "Something went wrong. Please check your input or try again later.";
    setError((prev: any) => ({ ...prev, other: errorMessage }));
    Alert.alert("Registration Failed", errorMessage);
  }
};

const SignUp3 = () => {
  const router = useRouter();
  const { username, email, password } = useLocalSearchParams();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    age: "",
    sex: "",
    bio: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState({ username: "", email: "", other: "" });
  const [socket, setSocket] = useState(null);
  const isConnected = useNetworkStatus();

  useEffect(() => {
    const newSocket = io(`${BASE_URL}`);
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);
  const validateAge = (age: string) => {
    const numericAge = parseInt(age, 10);
    if (!age) return "Age cannot be empty.";
    if (isNaN(numericAge)) {
      return "Age must be a number.";
    } else if (numericAge < 1) {
      return "Age can't be less than 1.";
    } else if (numericAge > 120) {
      return "Age can't be greater than 120.";
    }
    return "";
  };
  const submit = async () => {
    const userData = {
      username,
      email,
      password,
      firstName: form.firstName,
      lastName: form.lastName || "",
      age: form.age,
      sex: form.sex,
      bio: form.bio,
    };
    const timeoutDuration = 30000;
    setIsSubmitting(true);
    await registerUser(
      userData,
      "your_token_here",
      timeoutDuration,
      socket,
      router,
      isConnected,
      setError
    );

    setIsSubmitting(false);
  };
  const isRegisterButtonEnabled = () => {
    return (
      username !== undefined &&
      email !== undefined &&
      password !== undefined &&
      form.firstName !== undefined &&
      form.age !== undefined &&
      form.sex !== undefined &&
      form.bio !== undefined &&
      username.trim() !== "" &&
      email.trim() !== "" &&
      password.trim() !== "" &&
      form.firstName.trim() !== "" &&
      form.age.trim() !== "" &&
      form.sex.trim() !== ""
    );
  };
  return (
    <SafeAreaView className="h-full bg-black-200">
      <ScrollView
        contentContainerStyle={{ height: "100%" }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full h-full justify-center px-4 my-8">
          <Text className="text-4xl text-secondary-300 font-spotifymixuititle">
            Personal Information
          </Text>
          <View className="">
            <FormField
              title="First Name"
              value={form.firstName}
              handleChangeText={(e: any) => setForm({ ...form, firstName: e })}
              warning={
                form.firstName.length >= 0 ? "" : "First name cannot be empty."
              }
              otherStyles="mt-5 w-full"
              placeholder={undefined}
              keyboardType={undefined}
              autoCapitalize={undefined}
            />
            <FormField
              title="Last Name"
              value={form.lastName}
              handleChangeText={(e: any) => setForm({ ...form, lastName: e })}
              warning=""
              otherStyles="mt-5 w-full"
              placeholder={undefined}
              keyboardType={undefined}
              autoCapitalize={undefined}
            />
          </View>
          <View className="flex-row justify-between mt-5">
            <FormField
              title="Age"
              value={form.age}
              handleChangeText={(e: any) => setForm({ ...form, age: e })}
              warning={form.age.length > 0 ? validateAge(form.age) : ""}
              otherStyles="w-1/2 pr-2"
              keyboardType="numeric"
              placeholder={undefined}
              autoCapitalize={undefined}
            />
            <CustomDropdown
              title="Gender"
              options={["Male", "Female", "Other"]}
              selectedValue={form.sex}
              setSelectedValue={(value: any) =>
                setForm({ ...form, sex: value })
              }
              otherStyles="w-1/2 pl-2"
            />
          </View>
          <FormField
            title="Bio"
            value={form.bio}
            handleChangeText={(e: any) => setForm({ ...form, bio: e })}
            warning=""
            otherStyles="mt-5"
            placeholder="Tell us about yourself"
            autoCapitalize="none"
            keyboardType={undefined}
          />
          <View className="justify-center pt-7 flex-row gap-2">
            <CustomButton
              title="Register"
              handlePress={submit}
              containerStyles="mt-10 w-1/2 rounded-full"
              disabled={!isRegisterButtonEnabled() || isSubmitting}
              isLoading={isSubmitting}
              textStyles={undefined}
              background={undefined}
            />
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

export default SignUp3;
