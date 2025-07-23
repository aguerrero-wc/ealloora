// constants/Colors.ts

// Base colors
const white = '#fff';
const darkGrey = '#222';
const darkBlue = '#307196';
const green = '#4fbf6f';
const black = '#212121';
const grey = '#757575';
const lightGrey = '#d2d6de';
const red = '#fe504f';
const blue = '#0079BD';

// Basic palette
const primary = red;
const primaryDark = darkBlue;
const secondary = blue;
const accent = blue;

// Color interface for type safety
interface Colors {
  actionBar: string;
  actionBarText: string;
  primaryText: string;
  secondaryText: string;
  primaryDarkText: string;
  secondaryDarkText: string;
  valueDarkText: string;
  primaryLightInputText: string;
  primaryLightInputTextAccent: string;
  secondaryLightInputText: string;
  secondaryLightInputTextAccent: string;
  primaryDarkInputText: string;
  primaryLightInputEdit: string;
  primaryDarkInputTextAccent: string;
  primaryButton: string;
  primaryTextButton: string;
  secondaryButton: string;
  secondaryTextButton: string;
  drawer: string;
  drawerText: string;
  drawerTextAccent: string;
  marker: string;
  markerText: string;
  markerBorder: string;
  cardBackground: string;
  homeDivider: string;
  geofence: string;
  loader: string;
  darkLoader: string;
  activitybackground: string;
  homeText: string;
  homeSubDivider: string;
  settingDivider: string;
  settingDividerBT: string;
  green: string;
  alarm: string;
  promoButton: string;
  promoTextButton: string;
  // Base colors for easy access
  white: string;
  black: string;
  grey: string;
  red: string;
  blue: string;
}

const colors: Colors = {
  actionBar: white,
  actionBarText: primary,
  primaryText: primary,
  secondaryText: secondary,
  primaryDarkText: primary,
  secondaryDarkText: black,
  valueDarkText: grey,
  primaryLightInputText: red,
  primaryLightInputTextAccent: red,
  secondaryLightInputText: secondary,
  secondaryLightInputTextAccent: secondary,
  primaryDarkInputText: '#666',
  primaryLightInputEdit: '#666',
  primaryDarkInputTextAccent: primary,
  primaryButton: primary,
  primaryTextButton: white,
  secondaryButton: primary,
  secondaryTextButton: white,
  drawer: darkGrey,
  drawerText: white,
  drawerTextAccent: primary,
  marker: primary,
  markerText: white,
  markerBorder: white,
  cardBackground: '#ffffff',
  homeDivider: white,
  geofence: '#3c8dbc32',
  loader: primary,
  darkLoader: primary,
  activitybackground: white,
  homeText: white,
  homeSubDivider: red,
  settingDivider: grey,
  settingDividerBT: '#d6d6d6',
  green: '#33aa33',
  alarm: '#d32f2f',
  promoButton: '#ffffff',
  promoTextButton: primary,
  // Base colors
  white,
  black,
  grey,
  red,
  blue,
};

export default colors;