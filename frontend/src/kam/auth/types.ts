export type AuthUser = {
  id: string;
  email: string;
  name: string;
  // Add more fields as needed
};

export type AuthSuccessData = {
  user: AuthUser;
  token: string;
}; 