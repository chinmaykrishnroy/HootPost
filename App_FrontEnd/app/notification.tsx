import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, FlatList, RefreshControl, ActivityIndicator, Button } from "react-native";
import { icons } from "../constants";
import { router } from "expo-router";
import BASE_URL from '../config.js';
import UserModal from "@/components/UserModal";


const NotificationTile = ({ notification, onAccept, onDelete, isLoading }) => {
  const [isModalVisible, setModalVisible] = useState(false);

  const handleUsernamePress = (id) => {
    setModalVisible(true);
  };
  return (
    <View className={`flex-row justify-between bg-[#0d0d0d] items-center p-4 mb-0.5 rounded-md border-2 border-primary-300/20 shadow-lg`}>
    <Text
      className="text-secondary font-spotifymixui text-sm flex-1"
      numberOfLines={2}
      ellipsizeMode="tail"
    >
      Got a {notification.type} from{' '}
      <Text
        className="text-primary font-spotifymixui text-sm"
        onPress={() => handleUsernamePress(notification._id)}
      >
        @{notification.username}
      </Text>.
    </Text>
      {notification.type === "connection request" && (
        <View className="flex-row ml-2">
        <TouchableOpacity
          onPress={() => onAccept(notification.username)}
          disabled={isLoading.accepting || isLoading.deleting}
          activeOpacity={0.9}
          className={`${isLoading.accepting || isLoading.deleting ? "opacity-70" : ""} bg-secondary rounded-md p-3`}
        >
          <Text className="text-black-200 text-xs font-spotifymixui">Accept</Text>
        </TouchableOpacity>
        <View style={{ width: 10 }} />
        <TouchableOpacity
          onPress={() => onDelete(notification.username)}
          disabled={isLoading.accepting || isLoading.deleting}
          activeOpacity={0.9}
          className={`${isLoading.accepting || isLoading.deleting ? "opacity-70" : ""} bg-primary-200 rounded-md p-3`}
        >
          <Text className="text-secondary-300 text-xs font-spotifymixui">Delete</Text>
        </TouchableOpacity>
      </View>
      )}
      {isModalVisible && (
        <UserModal
          userId={notification._id}
          isVisible={isModalVisible}
          onClose={() => setModalVisible(false)}
        />
      )}
    </View>
  );
};

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [loadingAction, setLoadingAction] = useState({ accepting: false, deleting: false });

  const fetchNotification = async () => {
    setLoadingNotifications(true);
    try {
      const response = await fetch(`${BASE_URL}/users/notifications`, {
        method: "GET",
        credentials: "include",
      });
      const notificationData = await response.json();
      setNotifications(notificationData);
    } catch (error) {
      setError(error);
      router.replace("/sign-in");
    } finally {
      setLoadingNotifications(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (username) => {
    setLoadingAction({ ...loadingAction, accepting: true });
    try {
      const response = await fetch(`${BASE_URL}/users/accept-connection/${username}`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        setNotifications(notifications.filter(notification => notification.username !== username));
      }
    } catch (error) {
      console.error('Error accepting connection:', error);
    } finally {
      setLoadingAction({ ...loadingAction, accepting: false });
    }
  };

  const handleDelete = async (username) => {
    setLoadingAction({ ...loadingAction, deleting: true });
    try {
      const response = await fetch(`${BASE_URL}/users/delete-request/${username}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        setNotifications(notifications.filter(notification => notification.username !== username));
      }
    } catch (error) {
      console.error('Error deleting request:', error);
    } finally {
      setLoadingAction({ ...loadingAction, deleting: false });
    }
  };

  useEffect(() => {
    fetchNotification();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotification();
  };

  if (loadingNotifications) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="undefined" color="#f33eb7" />
      </View>
    );
  }

  const noNotification = () => (
    <View className="flex-1 justify-center items-center bg-background ">
      <Text className="text-primary-200 font-spotifymixui text-lg">No Notifications</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-[#050505]">
      {error ? (
        <Text className="text-red-500">Failed to load notifications</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={noNotification}
          renderItem={({ item }) => (
            <NotificationTile
              notification={item}
              onAccept={handleAccept}
              onDelete={handleDelete}
              isLoading={loadingAction}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#f22fb1"]} progressBackgroundColor="black" />
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </View>
  );
};

export const NotificationScreenOptions = ({ navigation }) => {
  return {
    headerTitle: () => (
      <View className="flex-row items-center">
        <Text className="text-secondary text-2xl font-spotifymixui">
          Notifications
        </Text>
      </View>
    ),
    headerStyle: {
      backgroundColor: "#050405",
    },
    headerLeft: () => (
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Image
          source={icons.leftArrow}
          className="w-6 h-6 mr-4"
          style={{ tintColor: "#f33eb7" }}
        />
      </TouchableOpacity>
    ),
    headerRight: () => null,
    headerBackVisible: false,
  };
};

export default NotificationScreen;