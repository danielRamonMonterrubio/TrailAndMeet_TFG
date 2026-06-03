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
  value: string; // formato: "HH:mm"
  onTimeSelected: (timeString: string) => void;
};

const TimePickerInput = ({ label, value, onTimeSelected }: Props) => {
  const [showPicker, setShowPicker] = useState(false);
  
  // Parsear hora actual o usar ahora
  const parseTime = (timeString: string): Date => {
    const date = new Date();
    if (!timeString) return date;
    
    const parts = timeString.split(":");
    if (parts.length === 2) {
      const [hours, minutes] = parts.map(Number);
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        date.setHours(hours, minutes, 0, 0);
      }
    }
    return date;
  };

  const [selectedTime, setSelectedTime] = useState(parseTime(value));

  const handleTimeChange = (event: any, date: Date | undefined) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    
    if (date) {
      setSelectedTime(date);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      onTimeSelected(`${hours}:${minutes}`);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowPicker(true)}
      >
        <View style={styles.content}>
          <MaterialDesignIcons name="clock" size={20} color={colors.primaryDark} />
          <View style={styles.textContainer}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>
              {value || "Selecciona hora"}
            </Text>
          </View>
        </View>
        <MaterialDesignIcons name="chevron-right" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display={Platform.OS === "android" ? "default" : "spinner"}
          onChange={handleTimeChange}
          is24Hour={true}
        />
      )}
    </>
  );
};

export default TimePickerInput;

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
