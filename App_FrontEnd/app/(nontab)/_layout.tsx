import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";

const NonTabLayout = () => {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync("#050505");
  }, []);

  return (
    <>
      <Stack>
        <Stack.Screen 
          name="notification"
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="users"
          options={{ headerShown: false }}
        />
        {/* <Stack.Screen 
          name="sign-up2"
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="sign-up3"
          options={{ headerShown: false }}
        /> */}
      </Stack>
      <StatusBar backgroundColor="#050505" style="light" />
    </>
  );
};

export default NonTabLayout;
