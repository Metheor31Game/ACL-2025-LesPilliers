import fs from "fs";

const filePath = "./data/users.json";

export function getUsers() {
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath);
  return JSON.parse(data);
}

export function saveUsers(users) {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

