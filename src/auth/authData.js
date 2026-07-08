import { employees } from "../data/demoData.js";

export const ROLES = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
  CEO: "CEO",
  EXTERNAL_MONITOR: "External Project Monitor",
  REGIONAL_FOLLOW_UP: "Regional Follow-up Access",
  MANAGEMENT_MONITOR: "Management Monitoring Access",
  TEAM_MEMBER: "team_member",
  TEAM_LEAD: "team_lead",
  ROLE_MANAGER: "manager",
  GM: "gm",
  ROLE_CEO: "ceo",
};

export const ROLE_OPTIONS = [
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.EMPLOYEE,
  ROLES.CEO,
  ROLES.EXTERNAL_MONITOR,
  ROLES.REGIONAL_FOLLOW_UP,
  ROLES.MANAGEMENT_MONITOR,
  ROLES.TEAM_MEMBER,
  ROLES.TEAM_LEAD,
  ROLES.ROLE_MANAGER,
  ROLES.GM,
  ROLES.ROLE_CEO,
];

export const APPROVAL_OWNER_ID = "abdelrahman-soliman";

const quickLoginUserIds = [
  "role-manager",
  "role-gm",
  "role-ceo",
];

const legacyIdentifierMap = {
  "admin@demo.com": "gm@geotech3d.local",
  "manager@demo.com": "abdelrahman@geotech3d.local",
  "employee@demo.com": "mahmoud.mohamed@geotech3d.local",
  "sherif.gomaa": "gm@geotech3d.local",
  "sherif.gomaa@geotech3d.local": "gm@geotech3d.local",
  "mona.hassan": "gm@geotech3d.local",
  "mona.hassan@geotech3d.local": "gm@geotech3d.local",
  "abdelrahman.soliman": "abdelrahman@geotech3d.local",
  "abdelrahman.soliman@geotech3d.local": "abdelrahman@geotech3d.local",
  "waleed": "ceo@geotech3d.local",
  "waleed@geotech3d.local": "ceo@geotech3d.local",
  "team.member": "mahmoud.mohamed@geotech3d.local",
  "team.member@geotech3d.local": "mahmoud.mohamed@geotech3d.local",
  "team.lead": "mayar.abd.elazeem@geotech3d.local",
  "team.lead@geotech3d.local": "mayar.abd.elazeem@geotech3d.local",
  "omar": "mahmoud.mohamed@geotech3d.local",
  "omar@geotech3d.local": "mahmoud.mohamed@geotech3d.local",
  "qarani": "mayar.abd.elazeem@geotech3d.local",
  "qarani@geotech3d.local": "mayar.abd.elazeem@geotech3d.local",
  "nawar": "gm@geotech3d.local",
  "nawar@geotech3d.local": "gm@geotech3d.local",
};

function toAuthUser(employee) {
  return {
    id: employee.id,
    employeeId: employee.id,
    name: employee.name.trim(),
    username: employee.username,
    email: employee.email,
    password: employee.password,
    role: employee.role,
    department: employee.department,
    title: employee.title,
    actualRole: employee.actualRole,
    accessType: "Operational team account",
    badge: employee.role,
  };
}

const executiveUsers = [
  {
    id: "waleed",
    employeeId: null,
    name: "Eng. Waleed",
    username: "waleed",
    email: "waleed@geotech3d.local",
    password: "Geo@123456",
    role: ROLES.CEO,
    badge: "CEO",
    department: "Executive Management",
    title: "Chief Executive Officer",
    actualRole: "Executive Monitoring",
    accessType: "Full executive monitoring access",
    location: "Executive Office",
    countryRegion: "Executive Office",
  },
  {
    id: "omar",
    employeeId: null,
    name: "Omar",
    username: "omar",
    email: "omar@geotech3d.local",
    password: "Geo@123456",
    role: ROLES.EXTERNAL_MONITOR,
    badge: "External Monitor",
    department: "External Monitoring",
    title: "External Project Monitor",
    actualRole: "Project Monitoring",
    accessType: "External project monitoring access",
    location: "Dubai",
    countryRegion: "UAE - Dubai",
  },
  {
    id: "qarani",
    employeeId: null,
    name: "Qarani",
    username: "qarani",
    email: "qarani@geotech3d.local",
    password: "Geo@123456",
    role: ROLES.REGIONAL_FOLLOW_UP,
    badge: "Regional Follow-up",
    department: "Regional Follow-up",
    title: "Regional Follow-up Access",
    actualRole: "Workflow Review",
    accessType: "Regional project workflow follow-up",
    location: "Saudi Arabia",
    countryRegion: "Saudi Arabia",
  },
  {
    id: "nawar",
    employeeId: null,
    name: "Nawar",
    username: "nawar",
    email: "nawar@geotech3d.local",
    password: "Geo@123456",
    role: ROLES.MANAGEMENT_MONITOR,
    badge: "Management Monitor",
    department: "Management Monitoring",
    title: "Management Monitoring Access",
    actualRole: "Productivity Monitoring",
    accessType: "Management monitoring access",
    location: "Abu Dhabi",
    countryRegion: "UAE - Abu Dhabi",
  },
];

const roleAccessUsers = [
  {
    id: "role-manager",
    employeeId: APPROVAL_OWNER_ID,
    name: "Abdelrahman Soliman",
    username: "abdelrahman",
    email: "abdelrahman@geotech3d.local",
    password: "Geo@123456",
    role: ROLES.ROLE_MANAGER,
    badge: "OPERATION MANAGER",
    department: "Management",
    title: "Operation Manager",
    actualRole: "Operation Technical Manager",
    accessType: "Operation manager access",
  },
  {
    id: "role-gm",
    employeeId: "mona-hassan",
    name: "Mona Hassan",
    username: "gm",
    email: "gm@geotech3d.local",
    password: "Geo@123456",
    role: ROLES.GM,
    badge: "GENERAL MANAGER",
    department: "Management",
    title: "General Manager",
    actualRole: "Management visibility and controls",
    accessType: "Role-based GM access",
  },
  {
    id: "role-ceo",
    employeeId: null,
    name: "Eng. Waleed",
    username: "ceo",
    email: "ceo@geotech3d.local",
    password: "Geo@123456",
    role: ROLES.ROLE_CEO,
    badge: "CEO",
    department: "Executive Management",
    title: "Chief Executive Officer",
    actualRole: "Executive monitoring",
    accessType: "Role-based CEO access",
  },
];

function isTeamLeadEmployee(employee) {
  if (employee.id === APPROVAL_OWNER_ID) return false;
  const teamLeadSignal = `${employee.title} ${employee.department}`.toLowerCase();
  return (
    teamLeadSignal.includes("team lead") ||
    teamLeadSignal.includes("team leader") ||
    teamLeadSignal.includes("head geomatics")
  );
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function findStoredUser(defaultUser, users) {
  return users.find((user) => {
    const values = [user.id, user.employeeId, user.email, user.username].map(normalizeText);
    return [defaultUser.id, defaultUser.email, defaultUser.username]
      .map(normalizeText)
      .some((value) => values.includes(value));
  });
}

function isStoredTeamAccount(storedUser, defaultUser) {
  return (
    normalizeText(storedUser?.email) === normalizeText(defaultUser.email) &&
    normalizeText(storedUser?.username) === normalizeText(defaultUser.username)
  );
}

function normalizeStoredUser(user) {
  const name = String(user.name || user.username || "Workspace User").trim();
  const username = String(user.username || user.email || name).trim();
  const role = ROLE_OPTIONS.includes(user.role) ? user.role : ROLES.EMPLOYEE;

  return {
    id: String(user.id || username).trim(),
    employeeId: user.employeeId || null,
    name,
    username,
    email: String(user.email || "").trim(),
    password: user.password || "",
    role,
    department: String(user.department || "Workspace Users").trim(),
    title: String(user.title || user.actualRole || "Workspace User").trim(),
    actualRole: String(user.actualRole || user.title || "Workspace User").trim(),
    badge: user.badge || role,
    accessType: user.accessType || "Custom local workspace account",
    location: user.location || "",
    countryRegion: user.countryRegion || user.location || "",
    custom: Boolean(user.custom),
  };
}

export const teamUsers = [...employees.map(toAuthUser), ...executiveUsers, ...roleAccessUsers];

const retiredSherifIdentifiers = new Set([
  "sherif-gomaa",
  "sherif.gomaa",
  "sherif.gomaa@geotech3d.local",
]);

export const quickLoginTeamMembers = employees
  .filter((employee) => employee.role === "Employee")
  .map(toAuthUser);

export const quickLoginTeamLeads = employees
  .filter(isTeamLeadEmployee)
  .map(toAuthUser);

export const quickLoginRoleCards = quickLoginUserIds
  .map((userId) => teamUsers.find((user) => user.id === userId || user.employeeId === userId))
  .filter(Boolean);

export const quickLoginUsers = quickLoginRoleCards;

export const DEFAULT_LOGIN_IDENTIFIER =
  quickLoginTeamMembers[0]?.email || quickLoginRoleCards[0]?.email || teamUsers[0]?.email || "";

export function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

export function authenticateUser(users, identifier, password) {
  const normalizedIdentifier = normalizeText(identifier);
  const matchedUser = users.find(
    (user) =>
      [user.email, user.username].map(normalizeText).includes(normalizedIdentifier) &&
      user.password === password,
  );

  return sanitizeUser(matchedUser);
}

export function ensureAuthUsers(users) {
  if (!Array.isArray(users) || !users.length) return teamUsers;

  const normalizedDefaults = teamUsers.map((defaultUser) => {
    const storedUser = findStoredUser(defaultUser, users);
    const canPreserveOverrides = isStoredTeamAccount(storedUser, defaultUser);

    return {
      ...defaultUser,
      role:
        canPreserveOverrides && ROLE_OPTIONS.includes(storedUser.role)
          ? storedUser.role
          : defaultUser.role,
      password: canPreserveOverrides ? storedUser.password || defaultUser.password : defaultUser.password,
      badge: defaultUser.badge,
      accessType: defaultUser.accessType,
      location: defaultUser.location,
      countryRegion: defaultUser.countryRegion,
    };
  });

  const customUsers = users
    .filter((user) => !findStoredUser(user, teamUsers))
    .filter((user) => {
      const identifiers = [user.id, user.employeeId, user.username, user.email].map(normalizeText);
      return !identifiers.some((identifier) => retiredSherifIdentifiers.has(identifier));
    })
    .map(normalizeStoredUser)
    .filter((user) => user.id && user.email && user.username);

  return [...normalizedDefaults, ...customUsers];
}

export function normalizeStoredLoginIdentifier(identifier, users = teamUsers) {
  const trimmedIdentifier = String(identifier || "").trim();
  const normalizedIdentifier = normalizeText(trimmedIdentifier);
  if (!normalizedIdentifier) return "";
  if (legacyIdentifierMap[normalizedIdentifier]) return legacyIdentifierMap[normalizedIdentifier];

  const isKnownIdentifier = users.some((user) =>
    [user.email, user.username].map(normalizeText).includes(normalizedIdentifier),
  );

  // Unknown remembered identifiers resolve to an empty field — the login form
  // must never suggest someone else's account.
  return isKnownIdentifier ? trimmedIdentifier : "";
}
