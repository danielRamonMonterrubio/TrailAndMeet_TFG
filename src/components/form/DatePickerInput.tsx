import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { colors } from "../../theme/colors";

type Props = {
  label: string;
  value: string; // formato: "dd/mm/aaaa"
  onDateSelected: (dateString: string) => void;
};

const DatePickerInput = ({ label, value, onDateSelected }: Props) => {
  const [showPicker, setShowPicker] = useState(false);
  
  // Parsear fecha actual o usar hoy
  const parseDate = (dateString: string): Date => {
    if (!dateString) return new Date();
    const parts = dateString.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState(parseDate(value));

  const handleDateChange = (event: any, date: Date | undefined) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    
    if (date) {
      setSelectedDate(date);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      onDateSelected(`${day}/${month}/${year}`);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowPicker(true)}
      >
        <View style={styles.content}>
          <MaterialDesignIcons name="calendar" size={20} color={colors.primaryDark} />
          <View style={styles.textContainer}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>
              {value || "Selecciona una fecha"}
            </Text>
          </View>
        </View>
        <MaterialDesignIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === "android" ? "default" : "spinner"}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </>
  );
};

export default DatePickerInput;

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.grayLight,
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "500",
  },
  value: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "600",
    marginTop: 2,
  },
});
