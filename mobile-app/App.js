import 'react-native-gesture-handler';
import React from 'react';
import * as Linking from 'expo-linking';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { NavigationContainer, getStateFromPath as getNavState } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { SimulatorWrapper, useResponsive } from './src/components/DesignSystem';

import LandingScreen from './src/screens/LandingScreen';
import HomeScreen from './src/screens/HomeScreen';
import PlaceholderScreen from './src/screens/PlaceholderScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import RegisterDetailsScreen from './src/screens/RegisterDetailsScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import VerifyOtpScreen from './src/screens/VerifyOtpScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import CustomSidebar from './src/components/Sidebar/CustomSidebar';

import ReportIncidentScreen from './src/screens/ReportIncidentScreen';
import AnnouncementsScreen from './src/screens/AnnouncementsScreen';
import MapScreen from './src/screens/MapScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import FloodHistoryScreen from './src/screens/FloodHistoryScreen';
import ReportDetailsScreen from './src/screens/ReportDetailsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import AdminResourceHub from './src/screens/AdminResourceHub';
import CoordinatorDashboardScreen from './src/screens/CoordinatorDashboardScreen';
import RoutePlannerScreen from './src/screens/RoutePlannerScreen';
import HEREPlannerScreen from './src/screens/HEREPlannerScreen';
import SheltersScreen from './src/screens/SheltersScreen';
import HazardMapScreen from './src/screens/HazardMapScreen';
import QuickReportScreen from './src/screens/QuickReportScreen';
import WeatherScreen from './src/screens/WeatherScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import ManageContactsScreen from './src/screens/ManageContactsScreen';
import BrgyHomeScreen from './src/screens/BrgyHomeScreen';
import BrgyOperationsScreen from './src/screens/BrgyOperationsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import FloodLevelListScreen from './src/screens/FloodLevelListScreen';
import LocalAreaMapScreen from './src/screens/LocalAreaMapScreen';
import EmergencyGuidesScreen from './src/screens/EmergencyGuidesScreen';
import EmergencyHotlinesScreen from './src/screens/EmergencyHotlinesScreen';
import FamilyHubScreen from './src/screens/FamilyHubScreen';
import FamilyGroupPanelScreen from './src/screens/FamilyGroupPanelScreen';
import AddFamilyMemberScreen from './src/screens/AddFamilyMemberScreen';
import DonationDrivesScreen from './src/screens/DonationDrivesScreen';
import DonationDriveDetailsScreen from './src/screens/DonationDriveDetailsScreen';
import DonationPaymentScreen from './src/screens/DonationPaymentScreen';
import DisasterAlertsScreen from './src/screens/DisasterAlertsScreen';

import CurvedTabBar from './src/components/CurvedTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// --- DRAWER WRAPPERS ---
function ResidentDrawer() {
  const { isMobile } = useResponsive();
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomSidebar {...props} />}
      screenOptions={{ 
        headerShown: false, 
        drawerType: 'front', 
        drawerStyle: { width: isMobile ? '85%' : 380 } 
      }}
    >
      <Drawer.Screen name="Tabs" component={ResidentTabs} />
    </Drawer.Navigator>
  );
}

function AdminDrawer() {
  const { isMobile } = useResponsive();
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomSidebar {...props} />}
      screenOptions={{ 
        headerShown: false, 
        drawerType: 'front', 
        drawerStyle: { width: isMobile ? '85%' : 380 } 
      }}
    >
      <Drawer.Screen name="Tabs" component={AdminTabs} />
    </Drawer.Navigator>
  );
}

function CoordinatorDrawer() {
  const { isMobile } = useResponsive();
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomSidebar {...props} />}
      screenOptions={{ 
        headerShown: false, 
        drawerType: 'front', 
        drawerStyle: { width: isMobile ? '85%' : 380 } 
      }}
    >
      <Drawer.Screen name="Tabs" component={CoordinatorTabs} />
    </Drawer.Navigator>
  );
}

function BrgyDrawer() {
  const { isMobile } = useResponsive();
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomSidebar {...props} />}
      screenOptions={{ 
        headerShown: false, 
        drawerType: 'front', 
        drawerStyle: { width: isMobile ? '85%' : 380 } 
      }}
    >
      <Drawer.Screen name="Tabs" component={BrgyTabs} />
    </Drawer.Navigator>
  );
}

// --- DONATION STACK ---
function DonationStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DonationDrivesList" component={DonationDrivesScreen} />
      <Stack.Screen name="DonationDriveDetails" component={DonationDriveDetailsScreen} />
      <Stack.Screen name="DonationPayment" component={DonationPaymentScreen} />
    </Stack.Navigator>
  );
}

// --- RESIDENT TABS ---
function ResidentTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CurvedTabBar {...props} role="resident" />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: Platform.OS === 'ios' ? 126 : 112,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen 
        name="Report" 
        component={ReportIncidentScreen}
        options={{ tabBarLabel: 'Report' }}
      />
      <Tab.Screen 
        name="SafeRoutes" 
        component={PlaceholderScreen} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('RoutePlanner');
          },
        })}
        options={{
          tabBarLabel: 'Planner',
        }}
      />
      <Tab.Screen 
        name="Donations" 
        component={DonationStack}
        options={{ tabBarLabel: 'Donations' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// --- ADMIN TABS ---
function AdminTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CurvedTabBar {...props} role="admin" />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: Platform.OS === 'ios' ? 126 : 112,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={AdminDashboardScreen} 
        options={{ tabBarLabel: 'Hub' }}
      />
      <Tab.Screen 
        name="Report" 
        component={ReportIncidentScreen}
        options={{ tabBarLabel: 'Report' }}
      />
      <Tab.Screen 
        name="AdminAction" 
        component={PlaceholderScreen} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('QuickReport'); 
          },
        })}
        options={{
          tabBarLabel: 'Action',
        }}
      />
      <Tab.Screen 
        name="Users" 
        component={UserManagementScreen}
        options={{ tabBarLabel: 'Users' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ tabBarLabel: 'System' }}
      />
    </Tab.Navigator>
  );
}

// --- COORDINATOR TABS ---
function CoordinatorTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CurvedTabBar {...props} role="coordinator" />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: Platform.OS === 'ios' ? 126 : 112,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={CoordinatorDashboardScreen} 
        options={{ tabBarLabel: 'Home', tabBarIcon: ({focused, color, size}) => <MaterialCommunityIcons name={focused ? "home-city" : "home-city-outline"} size={size} color={color} /> }}
      />
      <Tab.Screen 
        name="Report" 
        component={ReportIncidentScreen}
        options={{ tabBarLabel: 'Report' }}
      />
      <Tab.Screen 
        name="CoordinatorAction" 
        component={PlaceholderScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('RoutePlanner');
          },
        })}
        options={{
          tabBarLabel: 'Safe Routes',
          tabBarIcon: ({focused, color, size}) => <MaterialCommunityIcons name="route" size={30} color="#fff" />
        }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{ tabBarLabel: 'Reports', tabBarIcon: ({focused, color, size}) => <MaterialCommunityIcons name={focused ? "clipboard-list" : "clipboard-list-outline"} size={size} color={color} /> }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile', tabBarIcon: ({focused, color, size}) => <MaterialCommunityIcons name={focused ? "account-hard-hat" : "account-hard-hat-outline"} size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

// --- BRGY TABS ---
function BrgyTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <CurvedTabBar {...props} role="brgy" />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: Platform.OS === 'ios' ? 126 : 112,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={BrgyHomeScreen} 
        options={{ tabBarLabel: 'Hub' }}
      />
      <Tab.Screen 
        name="Report" 
        component={ReportIncidentScreen}
        options={{ tabBarLabel: 'Report' }}
      />
      <Tab.Screen 
        name="BrgyAction" 
        component={PlaceholderScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('RoutePlanner');
          },
        })}
        options={{
          tabBarLabel: 'Evac',
        }}
      />
      <Tab.Screen 
        name="Verify" 
        component={ReportsScreen}
        options={{ tabBarLabel: 'Verify' }}
      />
      <Tab.Screen 
        name="Alerts" 
        component={AnnouncementsScreen}
        options={{ tabBarLabel: 'Alerts' }}
      />
    </Tab.Navigator>
  );
}



const NAVIGATION_PERSISTENCE_KEY = 'eligtasmo.navigation.state.v1';

const linking = {
  prefixes: [Linking.createURL('/'), 'eligtasmo://', 'exp://'],
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    console.log('[Linking] Initial URL identified:', url);
    return url;
  },
  subscribe(listener) {
    const onReceiveURL = ({ url }) => {
      console.log('[Linking] Incoming deep link:', url);
      listener(url);
    };
    const subscription = Linking.addEventListener('url', onReceiveURL);
    return () => subscription.remove();
  },
  getStateFromPath(path, config) {
    console.log('[Linking] Resolving path:', path);
    const state = getNavState(path, config);
    console.log('[Linking] Resulting navigation state:', state);
    return state;
  },
  config: {
    screens: {
      Landing: '',
      Login: 'login',
      Register: 'register',
      RegisterDetails: 'register-details',
      ForgotPassword: 'forgot-password',
      VerifyOtp: 'verify-code',
      ResetPassword: 'reset-password',
      Main: {
        path: 'app',
        screens: {
          Tabs: {
            path: '',
            screens: {
              Home: 'home',
              Report: 'report',
              Reports: 'reports',
              Dashboard: 'dashboard',
              AdminAction: 'admin-action',
              Users: 'users',
              Settings: 'settings',
              CoordinatorAction: 'coordinator-action',
              BrgyAction: 'brgy-action',
              Verify: 'verify',
              Alerts: 'alerts',
              SafeRoutes: 'safe-routes',
              Donations: 'donations',
              Profile: 'profile'
            }
          }
        }
      },
      AdminDashboard: 'admin',
      CoordinatorDashboard: 'coordinator',
      BrgyDashboard: 'brgy',
      RoutePlanner: {
        path: 'route-planner/:lat?/:lon?/:name?/:mode?/:autoStart?/:sLat?/:sLon?/:reportId?',
        parse: {
          lat: (lat) => lat ? parseFloat(lat) : null,
          lon: (lon) => lon ? parseFloat(lon) : null,
          sLat: (sLat) => sLat ? parseFloat(sLat) : null,
          sLon: (sLon) => sLon ? parseFloat(sLon) : null,
          reportId: (id) => id || null,
          name: (name) => name ? decodeURIComponent(name) : '',
          mode: (mode) => mode || 'driving-car',
          autoStart: (autoStart) => autoStart === 'true',
        },
      },
      HEREPlanner: {
        path: 'here-planner/:lat?/:lon?/:name?/:mode?/:autoStart?/:sLat?/:sLon?',
        parse: {
          lat: (lat) => lat ? parseFloat(lat) : null,
          lon: (lon) => lon ? parseFloat(lon) : null,
          sLat: (sLat) => sLat ? parseFloat(sLat) : null,
          sLon: (sLon) => sLon ? parseFloat(sLon) : null,
          name: (name) => name ? decodeURIComponent(name) : '',
          mode: (mode) => mode || 'driving-car',
          autoStart: (autoStart) => autoStart === 'true',
        },
      },
      ReportIncident: 'report-incident',
      QuickReport: 'quick-report',
      Announcements: 'announcements',
      Shelters: 'shelters',
      HazardMap: 'hazard-map',
      FloodHistory: 'flood-history',
      ReportDetails: 'report-details',
      Settings: 'settings',
      Weather: 'weather',
      EditProfile: 'edit-profile',
      UserManagement: 'users',
      ManageContacts: 'manage-contacts',
      Notifications: 'notifications',
      FloodLevelList: 'flood-levels',
      LocalAreaMap: 'local-area-map',
      EmergencyGuides: 'emergency-guides',
      EmergencyHotlines: 'emergency-hotlines',
      AdminResourceHub: 'resource-hub',
      FamilyHub: 'family-hub',
      FamilyGroupPanel: 'family-group-panel',
      AddFamilyMember: 'add-family-member',
      BrgyOperations: 'brgy-operations',
      DonationDrives: 'donations',
      DonationDriveDetails: 'donation-details',
      DonationPayment: 'donation-payment',
    },
  },
};

const NavigationContent = ({ initialNavState, linking }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <LandingScreen />;

  return (
    <NavigationContainer
      linking={linking}
      initialState={initialNavState}
      onStateChange={(state) => {
        if (Platform.OS !== 'web') {
          AsyncStorage.setItem(NAVIGATION_PERSISTENCE_KEY, JSON.stringify(state)).catch(() => {});
        }
      }}
    >
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // --- AUTH STACK ---
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="RegisterDetails" component={RegisterDetailsScreen} />
          </>
        ) : (
          // --- APP STACK ---
          <>
            {/* Role Based Initial Screen Selection */}
            {user.role === 'admin' && <Stack.Screen name="AdminDashboard" component={AdminDrawer} />}
            {user.role === 'coordinator' && <Stack.Screen name="CoordinatorDashboard" component={CoordinatorDrawer} />}
            {user.role === 'brgy' && <Stack.Screen name="BrgyDashboard" component={BrgyDrawer} />}
            {(!user.role || user.role === 'resident') && <Stack.Screen name="Main" component={ResidentDrawer} />}

            {/* Common Tactical Screens */}
            <Stack.Screen name="RoutePlanner" component={RoutePlannerScreen} />
            <Stack.Screen name="HEREPlanner" component={HEREPlannerScreen} />
            <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="QuickReport" component={QuickReportScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
            <Stack.Screen name="Shelters" component={SheltersScreen} />
            <Stack.Screen name="HazardMap" component={HazardMapScreen} />
            <Stack.Screen name="FloodHistory" component={FloodHistoryScreen} />
            <Stack.Screen name="ReportDetails" component={ReportDetailsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Weather" component={WeatherScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="UserManagement" component={UserManagementScreen} />
            <Stack.Screen name="ManageContacts" component={ManageContactsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="DisasterAlerts" component={DisasterAlertsScreen} />
            <Stack.Screen name="FloodLevelList" component={FloodLevelListScreen} />
            <Stack.Screen name="LocalAreaMap" component={LocalAreaMapScreen} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EmergencyGuides" component={EmergencyGuidesScreen} />
            <Stack.Screen name="EmergencyHotlines" component={EmergencyHotlinesScreen} />
            <Stack.Screen name="AdminResourceHub" component={AdminResourceHub} />
            <Stack.Screen name="FamilyHub" component={FamilyHubScreen} />
            <Stack.Screen name="FamilyGroupPanel" component={FamilyGroupPanelScreen} />
            <Stack.Screen name="AddFamilyMember" component={AddFamilyMemberScreen} />
            <Stack.Screen name="BrgyOperations" component={BrgyOperationsScreen} />
            <Stack.Screen name="DonationDrives" component={DonationDrivesScreen} />
            <Stack.Screen name="DonationDriveDetails" component={DonationDriveDetailsScreen} />
            <Stack.Screen name="DonationPayment" component={DonationPaymentScreen} />
          </>
        )}

        {/* Auth Screens (Available globally for password reset/change) */}
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  const [isNavReady, setIsNavReady] = React.useState(Platform.OS === 'web');
  const [initialNavState, setInitialNavState] = React.useState();

  React.useEffect(() => {
    const restoreNavigationState = async () => {
      if (Platform.OS === 'web') {
        setIsNavReady(true);
        return;
      }

      try {
        const savedState = await AsyncStorage.getItem(NAVIGATION_PERSISTENCE_KEY);
        if (savedState) {
          setInitialNavState(JSON.parse(savedState));
        }
      } catch (error) {
      } finally {
        setIsNavReady(true);
      }
    };

    restoreNavigationState();
  }, []);

  if (!isNavReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <NavigationContent initialNavState={initialNavState} linking={linking} />
          </SafeAreaProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
