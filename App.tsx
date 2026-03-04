import React, { useEffect, useState } from "react";
import AppNavigator from "./src/navigation/AppNavigation";
import { supabase } from "./src/services/supabaseClient";

export default function App() {

  const [ready, setReady] = useState(false);

  const autoLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "danixramon@gmail.com",
      password: "Admin",
    });

    if (error) {
      console.log("Auto login error:", error);
    } else {
      console.log("Auto login OK:", data.session?.user?.id);
    }

    setReady(true);
  };

  useEffect(() => {
    autoLogin();
  }, []);

  if (!ready) {
    return null;
  }

  return <AppNavigator />;
}