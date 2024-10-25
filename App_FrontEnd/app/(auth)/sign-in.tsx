import { ScrollView, Text, View, Image, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../../constants";
import FormField from "../../components/FormField";
import CustomButton from "../../components/CustomButton";
import { Link, useRouter, useLocalSearchParams } from "expo-router";
import io from "socket.io-client";
import useNetworkStatus from "../../hooks/useNetworkStatus";
import * as SystemUI from "expo-system-ui";
import { loginUser } from "../../lib/auth";
import BASE_URL from '../../config.js';
import { useGlobalContext } from "../../context/GlobalProvider";

SystemUI.setBackgroundColorAsync("#050505");

const SignIn = () => {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState({ identifier: "", password: "", other: "" });
  const [socket, setSocket] = useState(null);
  const router = useRouter();
  const isConnected = useNetworkStatus();
  const { username, password } = useLocalSearchParams();
  const { setUser, setIsLoggedIn } = useGlobalContext();
  console.log("GlobalContext values:", { setUser, setIsLoggedIn });

  useEffect(() => {
    const newSocket = io(`${BASE_URL}`);
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (username) setForm((prevForm) => ({ ...prevForm, identifier: username }));
    if (password) setForm((prevForm) => ({ ...prevForm, password: password }));
  }, [username, password]);

  const submit = async () => {
    if (!isConnected) {
      Alert.alert("Network Error", "Please check your internet connection.");
      return;
    }

    setIsSubmitting(true);
    setError({ identifier: "", password: "", other: "" });

    try {
      const { response, data } = await loginUser(
        form.identifier,
        form.password,
        30000,
        "your_token_here"
      );

      if (response.ok) {
        socket.emit("user_logged_in", { username: form.identifier });
        setUser({ username: data.username, userId: data.userId });
        setIsLoggedIn(true);
        router.replace("/home");
      } else {
        handleError(data);
      }
    } catch (err) {
      handleError(null, err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleError = (data?: any, message?: string) => {
    console.log("Error data:", data, "Message:", message);
    const errorMessage = message === "Login request timed out"
      ? "Login request timed out. Please try again."
      : data?.error || "Something went wrong";
  
    if (data?.error === "User not found!") {
      setError((prev) => ({ ...prev, identifier: data.error }));
    } else if (data?.error === "Wrong Password!") {
      setError((prev) => ({ ...prev, password: data.error }));
    } else {
      setError((prev) => ({ ...prev, other: errorMessage }));
      Alert.alert("Login Failed", errorMessage);
    }
  };

  const isFormValid = form.identifier.trim() !== "" && form.password.trim() !== "";

  return (
    <SafeAreaView className="h-full bg-black-200">
      <ScrollView contentContainerStyle={{ height: "100%" }} keyboardShouldPersistTaps="handled">
        <View className="w-full h-full justify-center px-4 my-8">
          <View className="flex-row items-center mb-5 mr-4">
            <Image source={images.icon} className="w-8 h-8 mr-2" />
            <Text className="text-4xl text-secondary-300 font-spotifymixuititle ">
              Login to {""}
              <Text className="text-secondary ml-20">Hoot<Text className=" text-primary-200">Post</Text></Text>
            </Text>
          </View>
          <FormField
            title="Username or Email"
            value={form.identifier}
            handleChangeText={(e: any) => setForm({ ...form, identifier: e })}
            otherStyles="mt-5"
            warning={error.identifier}
            autoCapitalize="none" placeholder={undefined} keyboardType={undefined}          
          />
          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e: any) => setForm({ ...form, password: e })}
            otherStyles="mt-5"
            warning={error.password}
            autoCapitalize="none" placeholder={undefined} keyboardType={undefined}          
          />

          <View className="justify-center pt-7 flex-row gap-2">
            <CustomButton
              title="Log In"
              handlePress={submit}
              containerStyles="mt-10 w-1/2 rounded-full"
              isLoading={isSubmitting}
              disabled={!isFormValid} textStyles={undefined} background={undefined}            
            />
          </View>
          <View className="justify-center pt-7 flex-row gap-2">
            <Text className="text-lg text-secondary-300 font-spotifymixuititlevar">New User?</Text>
            <Link href="/sign-up" className="text-lg text-primary font-spotifymixuititlevar">
              Sign Up
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;
