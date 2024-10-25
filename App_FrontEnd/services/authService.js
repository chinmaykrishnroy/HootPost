import { Alert } from "react-native";
import BASE_URL from '../config.js';

export const registerUser = async (userData, authentication, timeoutDuration, socket, router, isConnected, setError) => {
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
        setTimeout(() => reject(new Error("Registration request timed out")), timeoutDuration);
      });
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      const data = await response.json();
      if (response.ok) {
        console.log("Registration success", data);
        socket.emit("user_registered", { username: userData.username });
        router.push("/home");
      } else {
        if (data.error === "Username already exists!") {
          setError((prev) => ({ ...prev, username: data.error }));
          Alert.alert("Username already exists!", errorMessage);
          router.push("/sign-up");
        } else if (data.error === "Email already exists!") {
          setError((prev) => ({ ...prev, email: data.error }));
          Alert.alert("Email already exists!", errorMessage);
          router.push("/sign-up");
        } else {
          const errorMessage = data.error || "Registration failed. Please try again.";
          setError((prev) => ({ ...prev, other: errorMessage }));
          Alert.alert("Registration Failed", errorMessage);
          router.push("/sign-up3");
        }
      }
    } catch (err) {
      const errorMessage = err.message === "Registration request timed out"
        ? "Registration request timed out. Please try again."
        : "Something went wrong.";
      setError((prev) => ({ ...prev, other: errorMessage }));
      console
      Alert.alert("Registration Failed", err);
    }
  };
  