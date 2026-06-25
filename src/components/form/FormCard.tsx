import { View, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

type Props = {
  children: React.ReactNode;
};

const FormCard = ({ children }: Props) => {
  return <View style={styles.container}>{children}</View>;
};

export default FormCard;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
});
