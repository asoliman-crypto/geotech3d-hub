import { APPROVAL_OWNER_ID, ROLES } from "./authData.js";

const MONITORING_ROLES = [
  ROLES.CEO,
  ROLES.ROLE_CEO,
  ROLES.GM,
  ROLES.EXTERNAL_MONITOR,
  ROLES.REGIONAL_FOLLOW_UP,
  ROLES.MANAGEMENT_MONITOR,
];

const FULL_MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.GM];
const PROJECT_MANAGEMENT_ROLES = [
  ROLES.ADMIN,
  ROLES.GM,
  ROLES.MANAGER,
  ROLES.ROLE_MANAGER,
];
const TEAM_LEAD_ROLES = [ROLES.TEAM_LEAD];
const TEAM_MEMBER_ROLES = [ROLES.EMPLOYEE, ROLES.TEAM_MEMBER];

const REQUESTER_ROLES = [
  ROLES.EXTERNAL_MONITOR,
  ROLES.REGIONAL_FOLLOW_UP,
  ROLES.MANAGEMENT_MONITOR,
];

// NOTE (2026-07-08, user decision): team members (Employee / team_member) get a
// deliberately minimal, distraction-free workspace — only "My Tasks", attendance
// and notifications. No dashboard, projects, map or project detail for them.
export const VIEW_ACCESS = {
  // "My Day" smart home — the personalised landing screen for everyone.
  home: [
    ...PROJECT_MANAGEMENT_ROLES,
    ...TEAM_LEAD_ROLES,
    ...TEAM_MEMBER_ROLES,
    ...MONITORING_ROLES,
  ],
  dashboard: [...PROJECT_MANAGEMENT_ROLES, ...TEAM_LEAD_ROLES, ...MONITORING_ROLES],
  report: [...PROJECT_MANAGEMENT_ROLES, ...TEAM_LEAD_ROLES, ...MONITORING_ROLES],
  insights: [...PROJECT_MANAGEMENT_ROLES, ...TEAM_LEAD_ROLES, ...MONITORING_ROLES],
  map: [...PROJECT_MANAGEMENT_ROLES, ...TEAM_LEAD_ROLES, ...MONITORING_ROLES],
  projects: [...PROJECT_MANAGEMENT_ROLES, ...TEAM_LEAD_ROLES, ...MONITORING_ROLES],
  archive: [...PROJECT_MANAGEMENT_ROLES, ...TEAM_LEAD_ROLES, ...MONITORING_ROLES],
  detail: [...PROJECT_MANAGEMENT_ROLES, ...TEAM_LEAD_ROLES, ...MONITORING_ROLES],
  tasks: [
    ...PROJECT_MANAGEMENT_ROLES,
    ...TEAM_LEAD_ROLES,
    ...TEAM_MEMBER_ROLES,
    ...MONITORING_ROLES,
  ],
  review: [...PROJECT_MANAGEMENT_ROLES, ...TEAM_LEAD_ROLES],
  gantt: [
    ...PROJECT_MANAGEMENT_ROLES,
    ROLES.CEO,
    ROLES.ROLE_CEO,
    ROLES.REGIONAL_FOLLOW_UP,
    ROLES.TEAM_LEAD,
  ],
  workload: [
    ...PROJECT_MANAGEMENT_ROLES,
    ROLES.CEO,
    ROLES.ROLE_CEO,
    ROLES.MANAGEMENT_MONITOR,
    ROLES.TEAM_LEAD,
  ],
  attendance: [
    ...PROJECT_MANAGEMENT_ROLES,
    ...TEAM_LEAD_ROLES,
    ...TEAM_MEMBER_ROLES,
    ROLES.CEO,
    ROLES.ROLE_CEO,
    ROLES.MANAGEMENT_MONITOR,
  ],
  new: [...PROJECT_MANAGEMENT_ROLES],
  notifications: [
    ...PROJECT_MANAGEMENT_ROLES,
    ...TEAM_LEAD_ROLES,
    ...TEAM_MEMBER_ROLES,
    ...MONITORING_ROLES,
  ],
  users: [...FULL_MANAGEMENT_ROLES],
  audit: [
    ...FULL_MANAGEMENT_ROLES,
    ROLES.MANAGER,
    ROLES.ROLE_MANAGER,
    ROLES.CEO,
    ROLES.ROLE_CEO,
    ROLES.MANAGEMENT_MONITOR,
  ],
  trash: [...PROJECT_MANAGEMENT_ROLES, ...TEAM_LEAD_ROLES],
  settings: [...FULL_MANAGEMENT_ROLES],
};

function isOperationManagerUser(user) {
  return user?.id === APPROVAL_OWNER_ID || user?.employeeId === APPROVAL_OWNER_ID;
}

function isTeamLeadUser(user) {
  if (user?.role === ROLES.TEAM_LEAD) return true;
  const signal = `${user?.title || ""} ${user?.actualRole || ""} ${user?.department || ""}`.toLowerCase();
  return signal.includes("team lead") || signal.includes("head geomatics");
}

// Project creation is allowed for: Admin/GM, the CEO, the operation manager
// (Abdelrahman), and team leads. NOT for generic managers or other roles.
export function canCreateProject(user) {
  if (!user) return false;
  return (
    FULL_MANAGEMENT_ROLES.includes(user.role) ||
    user.role === ROLES.CEO ||
    user.role === ROLES.ROLE_CEO ||
    isOperationManagerUser(user) ||
    isTeamLeadUser(user)
  );
}

export function canViewCompanyReport(user) {
  if (!user) return false;
  return (
    FULL_MANAGEMENT_ROLES.includes(user.role) ||
    user.role === ROLES.CEO ||
    user.role === ROLES.ROLE_CEO ||
    isOperationManagerUser(user)
  );
}

export function canAccessView(user, viewId) {
  if (!user || !viewId) return false;
  if (viewId === "approvals") return FULL_MANAGEMENT_ROLES.includes(user.role) || user.id === APPROVAL_OWNER_ID;
  if (viewId === "company-report") return canViewCompanyReport(user);
  if (viewId === "project-report") return Boolean(VIEW_ACCESS.detail?.includes(user.role));
  if (viewId === "new") return canCreateProject(user);
  return Boolean(VIEW_ACCESS[viewId]?.includes(user.role));
}

export function getAccessibleNavItems(navItems, user) {
  return navItems.filter((item) => canAccessView(user, item.id));
}

export function getCapabilities(user) {
  const role = user?.role;
  const isApprovalOwner = user?.id === APPROVAL_OWNER_ID;
  const isRequester = REQUESTER_ROLES.includes(role);
  const isExecutiveMonitor =
    role === ROLES.CEO ||
    role === ROLES.ROLE_CEO ||
    role === ROLES.GM ||
    role === ROLES.MANAGEMENT_MONITOR;
  const canEditOperations = PROJECT_MANAGEMENT_ROLES.includes(role);
  const canManageTeamTasks = canEditOperations || TEAM_LEAD_ROLES.includes(role);
  const canManageSystem = FULL_MANAGEMENT_ROLES.includes(role);

  return {
    canManageProjects: canEditOperations,
    canCreateProjects: canCreateProject(user),
    canManageTasks: canManageTeamTasks,
    canCancelProjects: canEditOperations,
    canManageUsers: canManageSystem,
    canManageSettings: canManageSystem,
    canViewReports:
      PROJECT_MANAGEMENT_ROLES.includes(role) ||
      role === ROLES.CEO ||
      role === ROLES.ROLE_CEO ||
      role === ROLES.MANAGEMENT_MONITOR,
    canViewCompanyReport:
      canManageSystem ||
      role === ROLES.CEO ||
      role === ROLES.ROLE_CEO ||
      user?.id === APPROVAL_OWNER_ID ||
      user?.employeeId === APPROVAL_OWNER_ID,
    canViewAuditLog:
      canManageSystem ||
      role === ROLES.MANAGER ||
      role === ROLES.ROLE_MANAGER ||
      role === ROLES.CEO ||
      role === ROLES.ROLE_CEO ||
      role === ROLES.MANAGEMENT_MONITOR,
    canManageAttendance:
      canManageSystem ||
      role === ROLES.MANAGER ||
      role === ROLES.ROLE_MANAGER ||
      role === ROLES.GM,
    canManageTrash: canEditOperations || TEAM_LEAD_ROLES.includes(role),
    canEditProtectedData: canEditOperations,
    canViewExecutiveDashboard:
      PROJECT_MANAGEMENT_ROLES.includes(role) ||
      MONITORING_ROLES.includes(role),
    canViewGantt: Boolean(VIEW_ACCESS.gantt.includes(role)),
    canViewWorkload: Boolean(VIEW_ACCESS.workload.includes(role)),
    canComment: Boolean(user),
    canCreateTaskRequests: isRequester,
    canSubmitTaskReview:
      TEAM_MEMBER_ROLES.includes(role) || TEAM_LEAD_ROLES.includes(role) || canManageTeamTasks,
    canReviewTasks: canManageTeamTasks,
    canCompleteTasksDirectly: canEditOperations,
    canApproveTaskRequests: canManageSystem || isApprovalOwner,
    canViewApprovalRequests:
      canManageSystem || isApprovalOwner || role === ROLES.CEO || role === ROLES.ROLE_CEO,
    canViewCriticalNotifications:
      canManageSystem ||
      role === ROLES.MANAGER ||
      role === ROLES.ROLE_MANAGER ||
      isExecutiveMonitor,
    isReadOnlyMonitor: MONITORING_ROLES.includes(role) && !isRequester,
  };
}

export function getRoleTone(role) {
  if (role === ROLES.ADMIN) return "danger";
  if (role === ROLES.CEO || role === ROLES.ROLE_CEO) return "executive";
  if (role === ROLES.GM) return "danger";
  if (role === ROLES.MANAGER || role === ROLES.ROLE_MANAGER || role === ROLES.TEAM_LEAD) return "warning";
  if (role === ROLES.EXTERNAL_MONITOR) return "monitor";
  if (role === ROLES.REGIONAL_FOLLOW_UP) return "regional";
  if (role === ROLES.MANAGEMENT_MONITOR) return "management";
  return "success";
}
