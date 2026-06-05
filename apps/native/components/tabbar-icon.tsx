import FontAwesome from "@expo/vector-icons/FontAwesome";

type FontAwesomeProps = React.ComponentProps<typeof FontAwesome>;

export const TabBarIcon = (props: {
  name: FontAwesomeProps["name"];
  color: FontAwesomeProps["color"];
}) => <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
