import { supabase } from "./supabaseClient";

export async function checkEmailExists(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_email_exists", {
    email_input: email,
  });

  if (error) {
    console.error("Error comprobando email:", error);
    throw error;
  }

  return data;
}

export async function checkUsernameExists(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_username_exists", {
    username_input: username,
  });

  if (error) {
    console.error("Error comprobando username:", error);
    throw error;
  }

  return data;
}


export async function completeRegistration(username: string) {
  const { error } = await supabase.rpc("complete_registration", {
    username_input: username,
  });

  if (error) {
    console.error("Error completando registro:", error);
    throw error;
  }
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Error login:", error);
    throw error;
  }

  return data;
}


export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error cerrando sesión:", error);
    throw error;
  }
}