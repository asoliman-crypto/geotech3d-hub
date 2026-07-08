import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  Database,
  Download,
  FileText,
  Filter,
  FolderKanban,
  GanttChartSquare,
  LayoutDashboard,
  Link2,
  ListChecks,
  ListOrdered,
  LogOut,
  MessageSquare,
  Minus,
  Plus,
  PlusCircle,
  Printer,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SidebarClose,
  SidebarOpen,
  SquareCheckBig,
  Trash2,
  TrendingUp,
  UserCog,
  Users,
  X,
} from "lucide-react";
import {
  APPROVAL_OWNER_ID,
  authenticateUser,
  ensureAuthUsers,
  normalizeStoredLoginIdentifier,
  ROLE_OPTIONS,
  ROLES,
  sanitizeUser,
  teamUsers,
} from "./auth/authData.js";
import {
  canAccessView,
  getAccessibleNavItems,
  getCapabilities,
  getRoleTone,
} from "./auth/permissions.js";
import { SettingsPage, UsersPage } from "./components/AdminPages.jsx";
import { DataLinksBar } from "./components/DataLinksBar.jsx";
import { FormattedRequirements } from "./components/FormattedRequirements.jsx";
import { GanttChart } from "./components/GanttChart.jsx";
import { KpiCard } from "./components/KpiCard.jsx";
import { LoginPage } from "./components/LoginPage.jsx";
import { LidarLoader } from "./components/LidarLoader.jsx";
import { ReportsCenter } from "./components/ReportsCenter.jsx";
import { MapView } from "./components/MapView.jsx";
import { AttendancePage } from "./components/AttendancePage.jsx";
import { AuditLogPage } from "./components/AuditLogPage.jsx";
import { CompanyReport } from "./components/CompanyReport.jsx";
import { ProjectGanttReport } from "./components/ProjectGanttReport.jsx";
import { ProjectCard } from "./components/ProjectCard.jsx";
import { TaskTable } from "./components/TaskTable.jsx";
import {
  Badge,
  EmptyState,
  ExportBar,
  Field,
  ProgressBar,
  SectionTitle,
  StatusBadge,
} from "./components/ui.jsx";
import {
  employees,
  initialProjects,
  initialTasks,
  starterProjects,
  starterTasks,
  starterDailyBaseline,
  NEW_LINE,
} from "./data/demoData.js";
import {
  calculateProjectProgress,
  clampProgress,
  formatDateRange,
  getEmployeeWorkload,
  getProjectStatus,
  isOverdue,
  isTaskComplete,
  makeProjectId,
  normalizeTaskProgress,
  syncProjectsWithTasks,
} from "./utils/projectLogic.js";
import { normalizeProjectsForEmployees, normalizeTasksForEmployees } from "./utils/dataMigration.js";
import { normalizeUrl } from "./utils/linkUtils.js";
import {
  exportProjectsCsv,
  exportTasksCsv,
  exportDailyReportCsv,
  downloadCsv,
  printReport,
  rowsToCsv,
} from "./utils/exportUtils.js";
import { useLocalStorage } from "./utils/storage.js";
import { isSupabaseConfigured, supabase } from "./lib/supabase.js";
import { useSyncedObject, useSyncedTable } from "./lib/syncedState.js";
import {
  isoToday,
  formatDateTime,
  formatShortDate,
  formatTime,
  getWeekStart,
  isWithinCurrentWeek,
  isLateCheckIn,
  getAttendanceStatus,
  getDaysUntil,
} from "./utils/dateUtils.js";
import { inferProjectGeo } from "./utils/geo.js";
import geoBrandLogo from "./assets/brand/geotech3d-logo-full.svg";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "report", label: "Daily Report", icon: FileText },
  { id: "insights", label: "Reports", icon: BarChart3 },
  { id: "map", label: "Map View", icon: Link2 },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "archive", label: "Project Archive", icon: Archive },
  { id: "detail", label: "Project Detail", icon: BriefcaseBusiness },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "review", label: "Review Queue", icon: SquareCheckBig },
  { id: "gantt", label: "Gantt Chart", icon: GanttChartSquare },
  { id: "workload", label: "Team Workload", icon: Users },
  { id: "attendance", label: "Attendance", icon: CalendarDays },
  { id: "new", label: "New Project", icon: PlusCircle },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "users", label: "Users & Roles", icon: UserCog },
  { id: "audit", label: "Audit Log", icon: ClipboardList },
  { id: "trash", label: "Recycle Bin", icon: Trash2 },
  { id: "settings", label: "Settings", icon: Settings },
];

const statuses = [
  "Planning",
  "In Progress",
  "In Review",
  "Waiting for Data",
  "On Hold",
  "Delayed",
  "Completed",
  "Cancelled",
];
const priorities = ["Low", "Medium", "High"];
const taskStatuses = [
  "Planning",
  "To Do",
  "In Progress",
  "Under Review",
  "Pending Review",
  "Needs Revision",
  "Blocked",
  "Completed",
  "Done",
];
const dataTypes = ["Path", "Download Link"];
const defaultProjectFilters = { search: "", status: "All", priority: "All" };
const cancellationTaskActions = [
  {
    value: "lock-open-tasks",
    label: "Keep tasks visible but locked/read-only",
  },
  {
    value: "cancel-open-tasks",
    label: "Cancel all open tasks",
  },
  {
    value: "keep-unchanged",
    label: "Keep tasks unchanged",
  },
];
const reviewNotificationRoles = [
  ROLES.ADMIN,
  ROLES.GM,
  ROLES.MANAGER,
  ROLES.ROLE_MANAGER,
  ROLES.TEAM_LEAD,
];
const approvalRequesterRoles = [
  ROLES.EXTERNAL_MONITOR,
  ROLES.REGIONAL_FOLLOW_UP,
  ROLES.MANAGEMENT_MONITOR,
];
const systemManagementRoles = [ROLES.ADMIN, ROLES.GM];
const fullProjectViewRoles = [
  ROLES.ADMIN,
  ROLES.GM,
  ROLES.MANAGER,
  ROLES.ROLE_MANAGER,
  ROLES.CEO,
  ROLES.ROLE_CEO,
  ROLES.EXTERNAL_MONITOR,
  ROLES.REGIONAL_FOLLOW_UP,
  ROLES.MANAGEMENT_MONITOR,
];
const taskLevelRoles = [ROLES.EMPLOYEE, ROLES.TEAM_MEMBER];
const operationalUserRoles = [
  ROLES.ADMIN,
  ROLES.GM,
  ROLES.MANAGER,
  ROLES.ROLE_MANAGER,
  ROLES.EMPLOYEE,
  ROLES.TEAM_MEMBER,
  ROLES.TEAM_LEAD,
];

const emptyDemoStorageVersion = "geotech3d-empty-demo-2026-06-08-v1";
const starterSeedVersion = "geotech3d-starter-2026-06-23-v2";
const starterProjectIds = new Set(starterProjects.map((project) => project.id));
const legacySeedProjectNames = new Set([
  "Cairo Metro Station Survey",
  "New Capital BIM Coordination",
  "Port GIS Asset Register",
]);
const legacySeedProjectIds = new Set(["PRJ-1001", "PRJ-1002", "PRJ-1003"]);
const legacySeedTaskTitles = new Set([
  "Collect site control observations",
  "Register point cloud data",
  "Draft CAD base drawing",
  "Collect source models",
  "Initial clash matrix",
  "Normalize GIS layer names",
]);

function createRecordId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Where a user lands after login / when their current view is not allowed.
// Managers land on the dashboard; task-level users land on "My Tasks".
function getLandingView(user) {
  if (!user) return "dashboard";
  if (canAccessView(user, "dashboard")) return "dashboard";
  const firstNavItem = navItems.find((item) => canAccessView(user, item.id));
  return firstNavItem?.id || "tasks";
}

function normalizeLookup(value) {
  return String(value || "").trim().toLowerCase();
}

function slugifyUser(value) {
  return (
    String(value || "workspace-user")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace-user"
  );
}

function makeUniqueUserId(source, users) {
  const baseId = slugifyUser(source);
  const existingIds = new Set(users.map((user) => user.id));
  if (!existingIds.has(baseId)) return baseId;

  let index = 2;
  while (existingIds.has(`${baseId}-${index}`)) index += 1;
  return `${baseId}-${index}`;
}

function blankProject(projects) {
  const defaultManagerId = employees.find((employee) => employee.id === "abdelrahman-soliman")?.id || employees[0].id;
  return {
    id: makeProjectId(projects),
    name: "",
    client: "",
    managerId: defaultManagerId,
    status: "Planning",
    priority: "Medium",
    start: isoToday,
    end: isoToday,
    requirements: "",
    dataLinks: [],
    team: [defaultManagerId],
  };
}

function blankTask(projects) {
  return {
    projectId: projects[0]?.id || "",
    title: "",
    assigneeId: employees[0].id,
    status: "To Do",
    progress: 0,
    start: isoToday,
    end: isoToday,
    priority: "Medium",
    notes: "",
    dataRefType: "Path",
    dataRefValue: "",
  };
}

function isApprovalRequester(user) {
  return approvalRequesterRoles.includes(user?.role);
}

function isPublishedTask(task) {
  return !task.approvalRequired || task.approvalStatus === "Approved";
}

function canViewTask(user, task) {
  if (!user || !task) return false;
  if (isPublishedTask(task)) return true;
  if (systemManagementRoles.includes(user.role) || user.role === ROLES.CEO || user.role === ROLES.ROLE_CEO) return true;
  if (user.id === APPROVAL_OWNER_ID || task.approvalOwnerId === user.id) return true;
  return task.createdBy?.id === user.id;
}

function canViewAllProjects(user) {
  return Boolean(user && fullProjectViewRoles.includes(user.role));
}

function isProjectCancelled(project) {
  return project?.status === "Cancelled";
}

function getCancellationTaskActionLabel(value) {
  return cancellationTaskActions.find((action) => action.value === value)?.label || value || "Not selected";
}

function canReviewTaskForUser(user, task, project) {
  if (!user || !task) return false;
  if (systemManagementRoles.includes(user.role)) return true;
  if ([ROLES.MANAGER, ROLES.ROLE_MANAGER, ROLES.GM].includes(user.role)) return true;
  if (user.id === APPROVAL_OWNER_ID || user.employeeId === APPROVAL_OWNER_ID) return true;
  if (user.role === ROLES.TEAM_LEAD) {
    return Boolean(project?.team?.includes(user.employeeId) || task.assigneeId === user.employeeId);
  }
  return false;
}

function canUserSeeNotification(user, notification) {
  if (!user || !notification) return false;
  if (
    notification.targetUserId &&
    [user.id, user.employeeId].filter(Boolean).includes(notification.targetUserId)
  ) {
    return true;
  }
  if (notification.targetRole && notification.targetRole === user.role) return true;
  if (Array.isArray(notification.targetRoles) && notification.targetRoles.includes(user.role)) return true;
  if (systemManagementRoles.includes(user.role) && notification.targetRole === ROLES.ADMIN) return true;
  return false;
}

function countAdmins(users, excludedUserId = "") {
  return users.filter((user) => user.role === ROLES.ADMIN && user.id !== excludedUserId).length;
}

function isOperationalUser(user) {
  return operationalUserRoles.includes(user?.role);
}

function authUserToPerson(user, removed = false) {
  return {
    id: user.employeeId || user.id,
    name: removed ? `${user.name} (Removed User)` : user.name,
    title: user.title || "Workspace User",
    department: user.department || "Workspace Users",
    actualRole: user.actualRole || user.title || "Workspace User",
    role: user.actualRole || user.role,
    username: user.username,
    email: user.email,
    capacity: removed ? 0 : 4,
    availability: removed ? "Removed" : "Available",
    removed,
  };
}

function getReferencedPersonIds(projects, tasks) {
  const ids = new Set();
  projects.forEach((project) => {
    if (project.managerId) ids.add(project.managerId);
    if (Array.isArray(project.team)) {
      project.team.forEach((memberId) => ids.add(memberId));
    }
  });
  tasks.forEach((task) => {
    if (task.assigneeId) ids.add(task.assigneeId);
  });
  return ids;
}

function getUserLabel(user) {
  return user?.name || user?.username || "Unknown user";
}

function filterProjects(projects, filters) {
  const search = filters.search.trim().toLowerCase();
  return projects.filter((project) => {
    const matchesSearch =
      !search ||
      [project.id, project.name, project.client]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    const matchesStatus = filters.status === "All" || project.status === filters.status;
    const matchesPriority = filters.priority === "All" || project.priority === filters.priority;
    return matchesSearch && matchesStatus && matchesPriority;
  });
}

function getVisibleProjectsForUser(user, projectList, taskList) {
  if (!user) return [];
  if (canViewAllProjects(user)) return projectList;

  const assignedProjectIds = new Set(
    taskList
      .filter((task) => isPublishedTask(task) && task.assigneeId === user.employeeId)
      .map((task) => task.projectId),
  );
  return projectList.filter(
    (project) =>
      project.managerId === user.employeeId ||
      project.team.includes(user.employeeId) ||
      assignedProjectIds.has(project.id),
  );
}

// Projects a team lead is responsible for (manages or is on the team of).
function getLeadProjectIds(user, projectList) {
  return new Set(
    projectList
      .filter(
        (project) =>
          project.managerId === user.employeeId ||
          (Array.isArray(project.team) && project.team.includes(user.employeeId)),
      )
      .map((project) => project.id),
  );
}

function getVisibleTasksForUser(user, taskList, projectList = []) {
  if (!user) return [];
  // Team leads see every task inside their own projects (their team's work),
  // not just tasks assigned to them personally — wider than a member,
  // narrower than management.
  if (user.role === ROLES.TEAM_LEAD) {
    const leadProjectIds = getLeadProjectIds(user, projectList);
    return taskList.filter(
      (task) =>
        canViewTask(user, task) &&
        isPublishedTask(task) &&
        (task.assigneeId === user.employeeId || leadProjectIds.has(task.projectId)),
    );
  }
  return taskList.filter((task) => {
    if (!canViewTask(user, task)) return false;
    if (canViewAllProjects(user)) return true;
    return isPublishedTask(task) && task.assigneeId === user.employeeId;
  });
}

function getInitials(name) {
  return String(name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const legacySessionUserMap = {
  "user-admin": "mona-hassan",
  "admin@demo.com": "mona-hassan",
  "sherif-gomaa": "mona-hassan",
  "sherif.gomaa": "mona-hassan",
  "sherif.gomaa@geotech3d.local": "mona-hassan",
  "user-manager": "abdelrahman-soliman",
  "manager@demo.com": "abdelrahman-soliman",
  "user-employee": "mahmoud-mohamed",
  "employee@demo.com": "mahmoud-mohamed",
};

function isSameAuthUser(user, sessionUser) {
  if (!user || !sessionUser) return false;
  const legacySessionId =
    legacySessionUserMap[String(sessionUser.id || "").toLowerCase()] ||
    legacySessionUserMap[String(sessionUser.email || "").toLowerCase()];
  if (legacySessionId) return user.id === legacySessionId;

  const userValues = [user.id, user.employeeId, user.email, user.username]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  const sessionValues = [sessionUser.id, sessionUser.employeeId, sessionUser.email, sessionUser.username]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return sessionValues.some((value) => userValues.includes(value));
}

export default function App() {
  // When Supabase env vars are present the app runs against the shared cloud
  // backend (real accounts + live sync). Otherwise every hook below transparently
  // falls back to localStorage, so local dev and the offline portable demo are
  // unaffected.
  const backendActive = isSupabaseConfigured;
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!backendActive);
  const syncEnabled = backendActive && Boolean(session);

  const [projects, setProjects] = useSyncedTable("projects", "projects-hub.projects", initialProjects, { enabled: syncEnabled });
  const [tasks, setTasks] = useSyncedTable("tasks", "projects-hub.tasks", initialTasks, { enabled: syncEnabled });
  const [notifications, setNotifications] = useSyncedTable("notifications", "projects-hub.notifications", [], { enabled: syncEnabled });
  const [comments, setComments] = useSyncedTable("comments", "projects-hub.comments", [], { enabled: syncEnabled });
  const [attendanceRecords, setAttendanceRecords] = useSyncedTable("attendance", "projects-hub.attendance", [], { enabled: syncEnabled });
  const [auditLog, setAuditLog] = useSyncedTable("audit_log", "projects-hub.auditLog", [], { enabled: syncEnabled });
  const [authUsers, setAuthUsers] = useSyncedTable("profiles", "projects-hub.authUsers", teamUsers, { enabled: syncEnabled });
  const [removedUserIds, setRemovedUserIds] = useSyncedObject("removedUserIds", "projects-hub.removedUserIds", [], { enabled: syncEnabled });
  const [trash, setTrash] = useSyncedObject("trash", "projects-hub.trash", [], { enabled: syncEnabled });
  const [authSession, setAuthSession] = useLocalStorage("projects-hub.authSession", null);
  // Empty by default: the login form starts blank; "Remember me" is the only
  // thing that pre-fills the identifier.
  const [rememberedEmail, setRememberedEmail] = useLocalStorage(
    "projects-hub.rememberedEmail",
    "",
  );
  const [activeView, setActiveView] = useLocalStorage("projects-hub.activeView", "dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(
    "projects-hub.sidebarCollapsed",
    false,
  );
  const [projectFilters, setProjectFilters] = useLocalStorage(
    "projects-hub.projectFilters",
    defaultProjectFilters,
  );
  const [selectedProjectId, setSelectedProjectId] = useLocalStorage(
    "projects-hub.selectedProjectId",
    initialProjects[0]?.id || "",
  );
  const [dailyBaseline, setDailyBaseline] = useSyncedObject("dailyBaseline", "projects-hub.dailyBaseline", {}, { enabled: syncEnabled });
  const [projectDraft, setProjectDraft] = useState(() => blankProject(projects));
  const [taskDraft, setTaskDraft] = useState(() => blankTask(projects));
  const [linkDraft, setLinkDraft] = useState({ title: "", url: "" });
  const [taskRequestMessage, setTaskRequestMessage] = useState("");
  const [cancelProjectDraft, setCancelProjectDraft] = useState(null);
  const [loader, setLoader] = useState({ active: false, label: "Loading workspace" });

  const normalizedProjects = useMemo(() => normalizeProjectsForEmployees(projects), [projects]);
  const normalizedTasks = useMemo(() => normalizeTasksForEmployees(tasks), [tasks]);
  const publishedTasks = useMemo(() => normalizedTasks.filter(isPublishedTask), [normalizedTasks]);
  const normalizedAuthUsers = useMemo(() => ensureAuthUsers(authUsers), [authUsers]);
  const safeAuthUsers = useMemo(
    () => normalizedAuthUsers.filter((user) => !removedUserIds.includes(user.id)),
    [normalizedAuthUsers, removedUserIds],
  );
  const rememberedIdentifier = useMemo(
    () => normalizeStoredLoginIdentifier(rememberedEmail, safeAuthUsers),
    [rememberedEmail, safeAuthUsers],
  );
  const currentUser = useMemo(() => {
    if (backendActive) {
      const email = String(session?.user?.email || "").toLowerCase();
      if (!email) return null;
      const profile = safeAuthUsers.find(
        (user) => String(user.email || "").toLowerCase() === email,
      );
      return sanitizeUser(profile);
    }
    if (!authSession?.user) return null;
    const latestUser = safeAuthUsers.find((user) => isSameAuthUser(user, authSession.user));
    return sanitizeUser(latestUser);
  }, [backendActive, session, authSession, safeAuthUsers]);
  const workspacePeople = useMemo(() => {
    const baseIds = new Set(employees.map((employee) => employee.id));
    const referencedIds = getReferencedPersonIds(normalizedProjects, normalizedTasks);
    const removedPersonIds = new Set(
      normalizedAuthUsers
        .filter((user) => removedUserIds.includes(user.id))
        .map((user) => user.employeeId || user.id),
    );
    const activeEmployees = employees.filter((employee) => !removedPersonIds.has(employee.id));
    const customPeople = safeAuthUsers
      .filter((user) => user.custom && isOperationalUser(user) && !baseIds.has(user.employeeId || user.id))
      .map((user) => authUserToPerson(user));
    const removedPeople = normalizedAuthUsers
      .filter((user) => removedUserIds.includes(user.id))
      .filter((user) => referencedIds.has(user.employeeId || user.id))
      .map((user) => authUserToPerson(user, true));

    return [...activeEmployees, ...customPeople, ...removedPeople];
  }, [normalizedAuthUsers, normalizedProjects, normalizedTasks, removedUserIds, safeAuthUsers]);
  const capabilities = useMemo(() => getCapabilities(currentUser), [currentUser]);
  const accessibleNavItems = useMemo(() => {
    const items = getAccessibleNavItems(navItems, currentUser);
    // Focused labels: team members see "My Tasks", team leads see "Team Tasks".
    if (taskLevelRoles.includes(currentUser?.role)) {
      return items.map((item) => (item.id === "tasks" ? { ...item, label: "My Tasks" } : item));
    }
    if (currentUser?.role === ROLES.TEAM_LEAD) {
      return items.map((item) => (item.id === "tasks" ? { ...item, label: "Team Tasks" } : item));
    }
    return items;
  }, [currentUser]);

  const enrichedProjects = useMemo(
    () =>
      normalizedProjects.map((project) => ({
        ...project,
        status: getProjectStatus(project, publishedTasks),
        progress: calculateProjectProgress(project.id, publishedTasks),
      })),
    [normalizedProjects, publishedTasks],
  );

  const roleScopedProjects = useMemo(
    () => getVisibleProjectsForUser(currentUser, enrichedProjects, normalizedTasks),
    [currentUser, enrichedProjects, normalizedTasks],
  );
  const roleScopedTasks = useMemo(
    () => getVisibleTasksForUser(currentUser, normalizedTasks, enrichedProjects),
    [currentUser, normalizedTasks, enrichedProjects],
  );
  const activeRoleScopedProjects = useMemo(
    () => roleScopedProjects.filter((project) => !isProjectCancelled(project)),
    [roleScopedProjects],
  );
  const cancelledRoleScopedProjects = useMemo(
    () => roleScopedProjects.filter(isProjectCancelled),
    [roleScopedProjects],
  );
  const activeProjectFilters = useMemo(
    () => ({
      ...projectFilters,
      status: projectFilters.status === "Cancelled" ? "All" : projectFilters.status,
    }),
    [projectFilters],
  );
  const archiveProjectFilters = useMemo(
    () => ({
      ...projectFilters,
      status: "All",
    }),
    [projectFilters],
  );
  const filteredProjects = useMemo(
    () => filterProjects(activeRoleScopedProjects, activeProjectFilters),
    [activeRoleScopedProjects, activeProjectFilters],
  );
  const filteredArchiveProjects = useMemo(
    () => filterProjects(cancelledRoleScopedProjects, archiveProjectFilters),
    [cancelledRoleScopedProjects, archiveProjectFilters],
  );
  const filteredProjectIds = useMemo(
    () => new Set(filteredProjects.map((project) => project.id)),
    [filteredProjects],
  );
  const filteredTasks = useMemo(
    () => roleScopedTasks.filter((task) => filteredProjectIds.has(task.projectId)),
    [roleScopedTasks, filteredProjectIds],
  );
  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => canUserSeeNotification(currentUser, notification)),
    [currentUser, notifications],
  );
  const delayedProjectAlerts = useMemo(() => {
    if (!capabilities.canViewCriticalNotifications) return [];
    return filteredProjects
      .filter((project) => project.status === "Delayed")
      .map((project) => ({
        id: `delayed-${project.id}`,
        type: "critical",
        title: "Delayed project alert",
        message: `${project.name} is currently delayed and needs management follow-up.`,
        createdAt: new Date().toISOString(),
        read: false,
        relatedProjectId: project.id,
        actionRequired: true,
      }));
  }, [capabilities.canViewCriticalNotifications, filteredProjects]);
  const notificationItems = useMemo(
    () => [...delayedProjectAlerts, ...visibleNotifications],
    [delayedProjectAlerts, visibleNotifications],
  );
  const approvalQueue = useMemo(
    () =>
      roleScopedTasks.filter(
        (task) => task.approvalRequired && task.approvalStatus !== "Approved",
      ),
    [roleScopedTasks],
  );
  const reviewQueue = useMemo(() => {
    if (!capabilities.canReviewTasks) return [];
    return normalizedTasks.filter((task) => {
      if (!isPublishedTask(task)) return false;
      if (task.qcStatus !== "Pending Review" && task.status !== "Pending Review") return false;
      const project = enrichedProjects.find((item) => item.id === task.projectId);
      if (isProjectCancelled(project)) return false;
      return canReviewTaskForUser(currentUser, task, project);
    });
  }, [capabilities.canReviewTasks, currentUser, enrichedProjects, normalizedTasks]);
  const selectedProjectComments = useMemo(
    () => comments.filter((comment) => comment.projectId === selectedProjectId),
    [comments, selectedProjectId],
  );

  const selectedProject =
    roleScopedProjects.find((project) => project.id === selectedProjectId) ||
    activeRoleScopedProjects[0] ||
    roleScopedProjects[0];
  const selectedProjectTasks = roleScopedTasks.filter(
    (task) => task.projectId === selectedProject?.id,
  );

  const workload = workspacePeople.map((employee) => ({
    ...employee,
    ...getEmployeeWorkload(employee, filteredTasks),
  }));
  const visibleWorkload = (() => {
    if (taskLevelRoles.includes(currentUser?.role)) {
      return workload.filter((employee) => employee.id === currentUser.employeeId);
    }
    // Team leads see the workload of their own project teams only.
    if (currentUser?.role === ROLES.TEAM_LEAD) {
      const leadTeamIds = new Set();
      roleScopedProjects.forEach((project) => {
        if (project.managerId) leadTeamIds.add(project.managerId);
        (project.team || []).forEach((memberId) => leadTeamIds.add(memberId));
      });
      return workload.filter((employee) => leadTeamIds.has(employee.id));
    }
    return workload;
  })();

  const dashboardStats = {
    totalProjects: filteredProjects.length,
    archivedProjects: cancelledRoleScopedProjects.length,
    activeProjects: filteredProjects.filter((project) =>
      ["Planning", "In Progress", "In Review", "Waiting for Data"].includes(project.status),
    ).length,
    completedTasks: filteredTasks.filter(isTaskComplete).length,
    delayedProjects: filteredProjects.filter((project) => project.status === "Delayed").length,
    atRiskTasks: filteredTasks.filter((task) => isOverdue(task) || ["Blocked", "Rejected", "Needs Revision"].includes(task.status)).length,
    waitingForDataProjects: filteredProjects.filter((project) => project.status === "Waiting for Data").length,
    pendingApprovals: roleScopedTasks.filter((task) => task.approvalStatus === "Pending Approval").length,
    pendingReviews: reviewQueue.length,
    upcomingDeadlines: filteredTasks.filter((task) => {
      const days = getDaysUntil(task.end);
      return !isTaskComplete(task) && task.status !== "Cancelled" && days >= 0 && days <= 14;
    }).length,
    avgUtilization: workload.length
      ? Math.round(workload.reduce((sum, employee) => sum + employee.utilization, 0) / workload.length)
      : 0,
    avgProgress: filteredProjects.length
      ? Math.round(
          filteredProjects.reduce((sum, project) => sum + project.progress, 0) /
            filteredProjects.length,
        )
      : 0,
  };

  // Daily Report: today's productivity â€” which projects advanced, what was
  // completed today, and how many points each project gained since start of day.
  const dailyReport = useMemo(() => {
    const baseline = dailyBaseline?.progress || {};
    const isTodayIso = (iso) => typeof iso === "string" && iso.slice(0, 10) === isoToday;
    const reportTasks = roleScopedTasks.filter(isPublishedTask);

    const completedToday = reportTasks
      .filter((task) => isTodayIso(task.completedAt))
      .map((task) => ({
        id: task.id,
        title: task.title,
        projectId: task.projectId,
        projectName:
          activeRoleScopedProjects.find((project) => project.id === task.projectId)?.name ||
          task.projectId,
        assigneeName:
          workspacePeople.find((person) => person.id === task.assigneeId)?.name || "Unassigned",
        at: task.completedAt,
      }));

    const perProject = activeRoleScopedProjects.map((project) => {
      const current = Number(project.progress || 0);
      const base = Object.prototype.hasOwnProperty.call(baseline, project.id)
        ? Number(baseline[project.id])
        : current;
      const gain = Math.max(0, current - base);
      const doneTodayCount = completedToday.filter((task) => task.projectId === project.id).length;
      const touchedToday = reportTasks.some(
        (task) => task.projectId === project.id && isTodayIso(task.updatedAt),
      );
      return {
        projectId: project.id,
        projectName: project.name,
        managerName:
          workspacePeople.find((person) => person.id === project.managerId)?.name || "Unassigned",
        status: project.status,
        base,
        current,
        gain,
        doneTodayCount,
        workedToday: gain > 0 || doneTodayCount > 0 || touchedToday,
      };
    });

    const worked = perProject.filter((row) => row.workedToday);
    const avgGain = worked.length
      ? Math.round(worked.reduce((sum, row) => sum + row.gain, 0) / worked.length)
      : 0;
    const overallProgress = activeRoleScopedProjects.length
      ? Math.round(
          activeRoleScopedProjects.reduce((sum, project) => sum + Number(project.progress || 0), 0) /
            activeRoleScopedProjects.length,
        )
      : 0;

    return {
      dateStr: isoToday,
      perProject,
      worked,
      completedToday,
      projectsWorkedCount: worked.length,
      tasksCompletedCount: completedToday.length,
      avgGain,
      overallProgress,
    };
  }, [activeRoleScopedProjects, roleScopedTasks, dailyBaseline, workspacePeople]);

  const weeklyReport = useMemo(() => {
    const weekTasks = roleScopedTasks.filter((task) =>
      [task.completedAt, task.updatedAt, task.createdAt].some(isWithinCurrentWeek),
    );
    const completedThisWeek = weekTasks.filter((task) => isTaskComplete(task));
    const delayed = filteredProjects.filter((project) => project.status === "Delayed");
    const blockedTasks = filteredTasks.filter((task) =>
      ["Blocked", "Needs Revision", "Rejected"].includes(task.status),
    );
    const attendanceThisWeek = attendanceRecords.filter((record) => isWithinCurrentWeek(record.checkIn));
    const lateCount = attendanceThisWeek.filter((record) => getAttendanceStatus(record) === "Late").length;
    const teamActivity = workspacePeople
      .map((person) => {
        const personTasks = weekTasks.filter((task) => task.assigneeId === person.id);
        return {
          id: person.id,
          name: person.name,
          department: person.department,
          completed: personTasks.filter(isTaskComplete).length,
          active: personTasks.filter((task) => !isTaskComplete(task)).length,
        };
      })
      .filter((row) => row.completed || row.active)
      .sort((a, b) => b.completed + b.active - (a.completed + a.active));

    return {
      weekStart: formatShortDate(getWeekStart().toISOString()),
      completedThisWeek,
      delayed,
      blockedTasks,
      attendanceThisWeek,
      lateCount,
      teamActivity,
      generatedAt: new Date().toISOString(),
    };
  }, [attendanceRecords, filteredProjects, filteredTasks, roleScopedTasks, workspacePeople]);

  const geoProjects = useMemo(
    () =>
      filteredProjects.map((project) => ({
        ...project,
        geo: inferProjectGeo(project),
        taskCount: filteredTasks.filter((task) => task.projectId === project.id).length,
      })),
    [filteredProjects, filteredTasks],
  );

  const visibleAttendanceRecords = useMemo(() => {
    if (capabilities.canManageAttendance || capabilities.canViewExecutiveDashboard) {
      return attendanceRecords;
    }
    const personId = currentUser?.employeeId || currentUser?.id;
    return attendanceRecords.filter((record) => record.userId === personId);
  }, [attendanceRecords, capabilities.canManageAttendance, capabilities.canViewExecutiveDashboard, currentUser]);

  const visibleAuditLog = useMemo(() => {
    if (capabilities.canViewAuditLog) return auditLog;
    return auditLog.filter((event) => event.actorId === currentUser?.id || event.actorEmployeeId === currentUser?.employeeId);
  }, [auditLog, capabilities.canViewAuditLog, currentUser]);

  useEffect(() => {
    const migratedProjects = normalizeProjectsForEmployees(projects);
    if (JSON.stringify(migratedProjects) !== JSON.stringify(projects)) {
      setProjects(migratedProjects);
    }
  }, [projects, setProjects]);

  useEffect(() => {
    const migratedTasks = normalizeTasksForEmployees(tasks);
    if (JSON.stringify(migratedTasks) !== JSON.stringify(tasks)) {
      setTasks(migratedTasks);
    }
  }, [tasks, setTasks]);

  useEffect(() => {
    if (backendActive) return;
    const storageVersionKey = "projects-hub.emptyDemoVersion";
    const hasLegacySeedData =
      projects.some(
        (project) =>
          legacySeedProjectNames.has(project.name) || legacySeedProjectIds.has(project.id),
      ) ||
      tasks.some(
        (task) =>
          legacySeedTaskTitles.has(task.title) || legacySeedProjectIds.has(task.projectId),
      );

    if (
      window.localStorage.getItem(storageVersionKey) === emptyDemoStorageVersion &&
      !hasLegacySeedData
    ) {
      return;
    }

    setProjects([]);
    setTasks([]);
    setComments([]);
    setNotifications([]);
    setAttendanceRecords([]);
    setAuditLog([]);
    setSelectedProjectId("");
    setProjectFilters(defaultProjectFilters);
    setProjectDraft(blankProject([]));
    setTaskDraft(blankTask([]));
    window.localStorage.setItem(storageVersionKey, emptyDemoStorageVersion);
  }, [
    projects,
    setComments,
    setNotifications,
    setProjectFilters,
    setProjects,
    setSelectedProjectId,
    setTasks,
    tasks,
  ]);

  // One-time starter seed: populate an empty workspace with realistic GEOTECH 3D
  // sample projects/tasks so the dashboard, Gantt and workload have data to show.
  // Runs once per starterSeedVersion and only when the workspace is empty, so it
  // never overwrites real projects/tasks the team has already entered.
  useEffect(() => {
    if (backendActive) return;
    const starterSeedKey = "projects-hub.starterSeedVersion";
    if (window.localStorage.getItem(starterSeedKey) === starterSeedVersion) return;
    // Seed an empty workspace, or refresh an unmodified starter demo to the latest
    // version (e.g. to add new fields). Real user-created projects are never touched.
    const isEmpty = projects.length === 0 && tasks.length === 0;
    const onlyStarterData = projects.length > 0 && projects.every((p) => starterProjectIds.has(p.id));
    if (isEmpty || onlyStarterData) {
      setProjects(starterProjects);
      setTasks(starterTasks);
      setSelectedProjectId(starterProjects[0]?.id || "");
      setDailyBaseline({});
    }
    window.localStorage.setItem(starterSeedKey, starterSeedVersion);
  }, [projects, tasks.length, setProjects, setTasks, setSelectedProjectId, setDailyBaseline]);

  // Maintain a per-day "start of day" progress baseline. On the first load of a
  // new day it records the baseline the Daily Report compares against to measure
  // how much each project advanced today. For the unmodified starter demo it uses
  // the seeded start-of-day values so the report shows a realistic positive gain.
  useEffect(() => {
    if (!normalizedProjects.length) return;
    if (dailyBaseline?.date === isoToday) return;
    const isStarterDemo = normalizedProjects.every((project) => starterProjectIds.has(project.id));
    const progress = {};
    normalizedProjects.forEach((project) => {
      progress[project.id] =
        isStarterDemo && starterDailyBaseline[project.id] != null
          ? starterDailyBaseline[project.id]
          : calculateProjectProgress(project.id, publishedTasks);
    });
    setDailyBaseline({ date: isoToday, progress });
  }, [dailyBaseline, normalizedProjects, publishedTasks, setDailyBaseline]);

  // Show the LiDAR drone loader briefly whenever the user switches views/tabs.
  useEffect(() => {
    setLoader({ active: true, label: "Scanning workspace" });
    const timer = window.setTimeout(() => setLoader((current) => ({ ...current, active: false })), 750);
    return () => window.clearTimeout(timer);
  }, [activeView]);

  useEffect(() => {
    if (JSON.stringify(normalizedAuthUsers) !== JSON.stringify(authUsers)) {
      setAuthUsers(normalizedAuthUsers);
    }
  }, [authUsers, normalizedAuthUsers, setAuthUsers]);

  useEffect(() => {
    if (rememberedIdentifier !== rememberedEmail) {
      setRememberedEmail(rememberedIdentifier);
    }
  }, [rememberedEmail, rememberedIdentifier, setRememberedEmail]);

  // Load any persisted Supabase session on start and keep it live thereafter.
  useEffect(() => {
    if (!backendActive) return undefined;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [backendActive]);

  useEffect(() => {
    if (backendActive) return;
    if (!authSession?.user || !currentUser) return;
    if (JSON.stringify(authSession.user) !== JSON.stringify(currentUser)) {
      setAuthSession({ ...authSession, user: currentUser });
    }
  }, [backendActive, authSession, currentUser, setAuthSession]);

  useEffect(() => {
    if (currentUser && !canAccessView(currentUser, activeView)) {
      const fallbackView = getLandingView(currentUser);
      if (fallbackView !== activeView) {
        setActiveView(fallbackView);
      }
    }
  }, [activeView, currentUser, setActiveView]);

  useEffect(() => {
    if (!currentUser || projectFilters.status !== "Cancelled") return;
    setProjectFilters((current) => ({ ...current, status: "All" }));
    if (canAccessView(currentUser, "archive")) {
      setActiveView("archive");
    }
  }, [currentUser, projectFilters.status, setActiveView, setProjectFilters]);

  async function login(identifier, password, rememberMe) {
    if (backendActive) {
      const raw = String(identifier || "").trim();
      let email = raw;
      if (raw && !raw.includes("@")) {
        const { data } = await supabase.rpc("email_for_login", { login: raw });
        email = data || "";
      }
      if (!email) {
        return { ok: false, message: "Invalid GEOTECH 3D account or password." };
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { ok: false, message: "Invalid GEOTECH 3D account or password." };
      }
      setRememberedEmail(rememberMe ? email : "");
      // The profile isn't loaded yet at this point; the access-redirect effect
      // sends task-level users to "My Tasks" as soon as currentUser resolves.
      setActiveView("dashboard");
      return { ok: true };
    }

    const user = authenticateUser(safeAuthUsers, identifier, password);
    if (!user) {
      return { ok: false, message: "Invalid GEOTECH 3D account or password." };
    }

    setAuthSession({ user, loggedInAt: new Date().toISOString() });
    setAuditLog((current) => [
      {
        id: createRecordId("audit"),
        type: "auth",
        title: "User login",
        message: `${user.name} signed in to GEOSPATIAL HUB.`,
        createdAt: new Date().toISOString(),
        actorId: user.id,
        actorEmployeeId: user.employeeId || "",
        actorName: user.name,
        actorRole: user.role,
      },
      ...current,
    ]);
    setRememberedEmail(rememberMe ? user.email : "");
    setActiveView(getLandingView(user));
    return { ok: true };
  }

  async function logout() {
    addAuditEvent("auth", "User logout", `${currentUser?.name || "User"} signed out.`);
    if (backendActive) {
      await supabase.auth.signOut();
    } else {
      setAuthSession(null);
    }
  }

  function updateUserRole(userId, role) {
    if (!capabilities.canManageUsers) return { ok: false, message: "Only Admin users can manage roles." };
    const targetUser = safeAuthUsers.find((user) => user.id === userId);
    if (!targetUser) return { ok: false, message: "User not found." };
    if (!ROLE_OPTIONS.includes(role)) return { ok: false, message: "Invalid role selected." };

    if (targetUser.role === ROLES.ADMIN && role !== ROLES.ADMIN && countAdmins(safeAuthUsers, userId) === 0) {
      return { ok: false, message: "At least one Admin account must remain." };
    }

    if (
      targetUser.id === currentUser.id &&
      targetUser.role === ROLES.ADMIN &&
      role !== ROLES.ADMIN &&
      countAdmins(safeAuthUsers, userId) === 0
    ) {
      return {
        ok: false,
        message: "You cannot remove your own Admin access unless another Admin account exists.",
      };
    }

    setAuthUsers((currentUsers) =>
      ensureAuthUsers(currentUsers).map((user) =>
        user.id === userId ? { ...user, role, badge: role } : user,
      ),
    );
    addAuditEvent("user-management", "User role updated", `${targetUser.name} role changed to ${role}.`, {
      relatedUserId: targetUser.id,
    });
    return { ok: true, message: `${targetUser.name}'s role was updated.` };
  }

  function addUser(userDraft) {
    if (!capabilities.canManageUsers) return { ok: false, message: "Only Admin users can add users." };

    const trimmedUser = {
      name: userDraft.name.trim(),
      username: userDraft.username.trim(),
      email: userDraft.email.trim(),
      password: userDraft.password.trim(),
      title: userDraft.title.trim(),
      department: userDraft.department.trim(),
      actualRole: userDraft.actualRole.trim(),
      role: userDraft.role,
      location: userDraft.location.trim(),
    };

    if (!trimmedUser.name) return { ok: false, message: "Full Name is required." };
    if (!trimmedUser.username) return { ok: false, message: "Username is required." };
    if (!trimmedUser.email) return { ok: false, message: "Email is required." };
    if (!trimmedUser.password) return { ok: false, message: "Password is required." };
    if (!ROLE_OPTIONS.includes(trimmedUser.role)) {
      return { ok: false, message: "System Role is required." };
    }

    const usernameExists = safeAuthUsers.some(
      (user) => normalizeLookup(user.username) === normalizeLookup(trimmedUser.username),
    );
    if (usernameExists) return { ok: false, message: "Username already exists." };

    const emailExists = safeAuthUsers.some(
      (user) => normalizeLookup(user.email) === normalizeLookup(trimmedUser.email),
    );
    if (emailExists) return { ok: false, message: "Email already exists." };

    const id = makeUniqueUserId(trimmedUser.username || trimmedUser.name, normalizedAuthUsers);
    const nextUser = {
      id,
      employeeId: operationalUserRoles.includes(trimmedUser.role) ? id : null,
      name: trimmedUser.name,
      username: trimmedUser.username,
      email: trimmedUser.email,
      password: trimmedUser.password,
      role: trimmedUser.role,
      title: trimmedUser.title || trimmedUser.actualRole || "Workspace User",
      department: trimmedUser.department || "Workspace Users",
      actualRole: trimmedUser.actualRole || trimmedUser.title || "Workspace User",
      badge: trimmedUser.role,
      accessType: "Custom local workspace account",
      location: trimmedUser.location,
      countryRegion: trimmedUser.location,
      custom: true,
    };

    setRemovedUserIds((current) => current.filter((removedId) => removedId !== id));
    setAuthUsers((currentUsers) => [...ensureAuthUsers(currentUsers), nextUser]);
    addAuditEvent("user-management", "User added", `${nextUser.name} was added as ${nextUser.role}.`, {
      relatedUserId: nextUser.id,
    });
    return { ok: true, message: `${nextUser.name} was added and can log in immediately.` };
  }

  function removeUser(userId) {
    if (!capabilities.canManageUsers) return { ok: false, message: "Only Admin users can remove users." };
    const targetUser = safeAuthUsers.find((user) => user.id === userId);
    if (!targetUser) return { ok: false, message: "User not found." };
    if (targetUser.id === currentUser.id) {
      return { ok: false, message: "You cannot remove the currently signed-in user." };
    }
    if (targetUser.role === ROLES.ADMIN && countAdmins(safeAuthUsers, userId) === 0) {
      return { ok: false, message: "At least one Admin account must remain." };
    }

    setRemovedUserIds((current) => [...new Set([...current, userId])]);
    setAuthUsers((currentUsers) => ensureAuthUsers(currentUsers));
    addAuditEvent("user-management", "User removed", `${targetUser.name} was removed from the workspace.`, {
      relatedUserId: targetUser.id,
    });
    return { ok: true, message: `${targetUser.name} was removed from this local workspace.` };
  }

  function openProject(projectId) {
    const openedProject = enrichedProjects.find((project) => project.id === projectId);
    setSelectedProjectId(projectId);
    setTaskDraft((current) => ({
      ...current,
      projectId: isProjectCancelled(openedProject)
        ? activeRoleScopedProjects[0]?.id || ""
        : projectId,
    }));
    setActiveView("detail");
  }

  function openGanttReport(projectId) {
    if (projectId) setSelectedProjectId(projectId);
    setActiveView("project-report");
  }

  function openCompanyReport() {
    setActiveView("company-report");
  }

  function addNotification(notification) {
    const nextNotification = {
      id: createRecordId("notif"),
      type: "info",
      createdAt: new Date().toISOString(),
      read: false,
      actionRequired: false,
      ...notification,
    };
    setNotifications((current) => [nextNotification, ...current]);
    return nextNotification;
  }

  function addAuditEvent(type, title, message, metadata = {}) {
    const actor = currentUser || {};
    const nextEvent = {
      id: createRecordId("audit"),
      type,
      title,
      message,
      createdAt: new Date().toISOString(),
      actorId: actor.id || "system",
      actorEmployeeId: actor.employeeId || "",
      actorName: actor.name || "System",
      actorRole: actor.role || "System",
      ...metadata,
    };
    setAuditLog((current) => [nextEvent, ...current].slice(0, 250));
    return nextEvent;
  }

  function handleAttendanceCheckIn() {
    if (!currentUser) return;
    const personId = currentUser.employeeId || currentUser.id;
    const now = new Date().toISOString();
    const existing = attendanceRecords.find(
      (record) => record.userId === personId && record.date === isoToday,
    );
    if (existing) return;
    const nextRecord = {
      id: createRecordId("att"),
      userId: personId,
      userName: currentUser.name,
      role: currentUser.role,
      department: currentUser.department || "Workspace Users",
      date: isoToday,
      checkIn: now,
      checkOut: "",
      status: isLateCheckIn(now) ? "Late" : "Present",
      workMode: "Office / Field",
      location: currentUser.location || currentUser.countryRegion || "GEOTECH 3D Workspace",
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
    setAttendanceRecords((current) => [nextRecord, ...current]);
    addAuditEvent("attendance", "Attendance check-in", `${currentUser.name} checked in.`, {
      relatedUserId: personId,
    });
  }

  function handleAttendanceCheckOut() {
    if (!currentUser) return;
    const personId = currentUser.employeeId || currentUser.id;
    const now = new Date().toISOString();
    setAttendanceRecords((current) =>
      current.map((record) =>
        record.userId === personId && record.date === isoToday && !record.checkOut
          ? {
              ...record,
              checkOut: now,
              status: "Checked Out",
              updatedAt: now,
            }
          : record,
      ),
    );
    addAuditEvent("attendance", "Attendance check-out", `${currentUser.name} checked out.`, {
      relatedUserId: personId,
    });
  }

  function updateAttendanceNote(recordId, notes) {
    setAttendanceRecords((current) =>
      current.map((record) =>
        record.id === recordId ? { ...record, notes, updatedAt: new Date().toISOString() } : record,
      ),
    );
  }

  function exportWeeklyReport() {
    const headers = ["Metric", "Value"];
    const rows = [
      ["Week Start", weeklyReport.weekStart],
      ["Completed Tasks This Week", weeklyReport.completedThisWeek.length],
      ["Delayed Projects", weeklyReport.delayed.length],
      ["Blocked / Revision Tasks", weeklyReport.blockedTasks.length],
      ["Attendance Records", weeklyReport.attendanceThisWeek.length],
      ["Late Check-ins", weeklyReport.lateCount],
    ];
    downloadCsv(`geotech3d-weekly-report-${isoToday}.csv`, rowsToCsv(headers, rows));
  }

  function exportAttendanceReport() {
    const headers = ["Date", "Name", "Role", "Department", "Check In", "Check Out", "Status", "Location", "Notes"];
    const rows = visibleAttendanceRecords.map((record) => [
      record.date,
      record.userName,
      record.role,
      record.department,
      formatTime(record.checkIn),
      formatTime(record.checkOut),
      getAttendanceStatus(record),
      record.location,
      record.notes,
    ]);
    downloadCsv(`geotech3d-attendance-${isoToday}.csv`, rowsToCsv(headers, rows));
  }

  function updateTask(id, patch) {
    const targetTask = normalizedTasks.find((task) => task.id === id);
    const targetProject = enrichedProjects.find((project) => project.id === targetTask?.projectId);
    if (!targetTask) return;
    if (isProjectCancelled(targetProject) && !capabilities.canManageProjects) return;

    const safePatch = { ...patch };
    if (!capabilities.canCompleteTasksDirectly) {
      if (["Done", "Completed"].includes(safePatch.status)) {
        safePatch.status = "Pending Review";
      }
      if (
        Object.prototype.hasOwnProperty.call(safePatch, "progress") &&
        Number(safePatch.progress) >= 100
      ) {
        safePatch.progress = 95;
      }
    }

    const nowIso = new Date().toISOString();
    const nextTasks = normalizedTasks.map((task) => {
      if (task.id !== id) return task;
      const wasComplete = isTaskComplete(task);
      let updated = {
        ...normalizeTaskProgress(task, safePatch),
        ...(capabilities.canCompleteTasksDirectly &&
        (["Done", "Completed"].includes(safePatch.status) || Number(safePatch.progress) >= 100)
          ? {
              qcStatus: "Accepted",
              reviewedBy: currentUser.id,
              reviewedByName: currentUser.name,
              reviewedAt: nowIso,
              reviewComment: "Completed directly by authorized manager.",
            }
          : {}),
        updatedAt: nowIso,
      };
      // Stamp completion the first time a task transitions into a complete state,
      // so the Daily Report can list what was finished today.
      if (!wasComplete && isTaskComplete(updated)) {
        updated = { ...updated, completedAt: nowIso };
      }
      return updated;
    });
    setTasks(nextTasks);
    setProjects((currentProjects) =>
      syncProjectsWithTasks(normalizeProjectsForEmployees(currentProjects), nextTasks.filter(isPublishedTask)),
    );
  }

  function createTask(event) {
    event.preventDefault();
    if (!taskDraft.title.trim() || !taskDraft.projectId) return;
    const isRequest = capabilities.canCreateTaskRequests && !capabilities.canManageTasks;
    const baseTask = {
      id: Math.max(0, ...normalizedTasks.map((task) => task.id)) + 1,
      ...taskDraft,
      assigneeId: taskDraft.assigneeId,
      createdBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        location: currentUser.location || currentUser.countryRegion || "",
      },
      createdAt: new Date().toISOString(),
      qcStatus: isTaskComplete(taskDraft) && capabilities.canCompleteTasksDirectly ? "Accepted" : "Not Submitted",
      submittedForReviewBy: "",
      submittedForReviewByName: "",
      submittedForReviewAt: "",
      reviewedBy: isTaskComplete(taskDraft) && capabilities.canCompleteTasksDirectly ? currentUser.id : "",
      reviewedByName: isTaskComplete(taskDraft) && capabilities.canCompleteTasksDirectly ? currentUser.name : "",
      reviewedAt:
        isTaskComplete(taskDraft) && capabilities.canCompleteTasksDirectly
          ? new Date().toISOString()
          : "",
      reviewComment: "",
      revisionCount: 0,
      returnedToAssigneeAt: "",
    };
    const nextTask = isRequest
      ? {
          ...baseTask,
          status: "Pending Approval",
          progress: 0,
          requestedStatus: taskDraft.status || "Planning",
          approvalRequired: true,
          approvalStatus: "Pending Approval",
          approvalOwnerId: APPROVAL_OWNER_ID,
          approvalOwner: "Eng. Abdelrahman Soliman",
          submittedAt: new Date().toISOString(),
        }
      : normalizeTaskProgress(baseTask, {
          progress: clampProgress(taskDraft.progress),
          status: taskDraft.status,
        });
    const nextTasks = [...normalizedTasks, nextTask];
    setTasks(nextTasks);
    setProjects((currentProjects) =>
      syncProjectsWithTasks(normalizeProjectsForEmployees(currentProjects), nextTasks.filter(isPublishedTask)),
    );
    addAuditEvent("task", "Task created", `${nextTask.title} was ${isRequest ? "submitted as a request" : "created"}.`, {
      relatedProjectId: nextTask.projectId,
      relatedTaskId: nextTask.id,
    });
    setTaskDraft(blankTask(normalizedProjects));
    if (isRequest) {
      const project = normalizedProjects.find((item) => item.id === nextTask.projectId);
      addNotification({
        type: "approval",
        title: "New task request pending approval",
        message: `${currentUser.name} submitted "${nextTask.title}" for ${project?.name || nextTask.projectId}.`,
        targetUserId: APPROVAL_OWNER_ID,
        relatedProjectId: nextTask.projectId,
        relatedTaskId: nextTask.id,
        actionRequired: true,
      });
      setTaskRequestMessage(
        "Your task request has been submitted. Please wait for Eng. Abdelrahman approval.",
      );
    } else {
      setTaskRequestMessage("");
    }
  }

  function handleApprovalAction(taskId, action, note = "") {
    const task = normalizedTasks.find((item) => item.id === taskId);
    if (!task || !capabilities.canApproveTaskRequests) return;
    const timestamp = new Date().toISOString();
    const actionConfig = {
      approve: {
        approvalStatus: "Approved",
        approvalRequired: true,
        status: task.requestedStatus || "Planning",
        approvedAt: timestamp,
        approvedBy: getUserLabel(currentUser),
        approvalNote: note,
      },
      reject: {
        approvalStatus: "Rejected",
        status: "Rejected",
        rejectedAt: timestamp,
        rejectedBy: getUserLabel(currentUser),
        rejectionReason: note || "Rejected by approval authority.",
      },
      modify: {
        approvalStatus: "Modification Requested",
        status: "Modification Requested",
        modificationRequestedAt: timestamp,
        modificationRequestedBy: getUserLabel(currentUser),
        modificationNote: note || "Please revise and resubmit this task request.",
      },
    };
    const patch = actionConfig[action];
    if (!patch) return;

    const nextTasks = normalizedTasks.map((item) => (item.id === taskId ? { ...item, ...patch } : item));
    setTasks(nextTasks);
    setProjects((currentProjects) =>
      syncProjectsWithTasks(normalizeProjectsForEmployees(currentProjects), nextTasks.filter(isPublishedTask)),
    );

    const creatorId = task.createdBy?.id;
    if (creatorId) {
      addNotification({
        type: "approval-result",
        title: `Task request ${patch.approvalStatus}`,
        message: `"${task.title}" is now ${patch.approvalStatus}.${note ? ` Note: ${note}` : ""}`,
        targetUserId: creatorId,
        relatedProjectId: task.projectId,
        relatedTaskId: task.id,
        actionRequired: action === "modify",
      });
    }
    addAuditEvent("approval", "Approval action", `${task.title} changed to ${patch.approvalStatus}.`, {
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    });
  }

  function openCancelProject(projectId) {
    if (!capabilities.canCancelProjects) return;
    const project = enrichedProjects.find((item) => item.id === projectId);
    if (!project || isProjectCancelled(project)) return;
    setCancelProjectDraft({
      projectId,
      reason: "",
      taskAction: "lock-open-tasks",
      error: "",
    });
  }

  function confirmCancelProject(event) {
    event.preventDefault();
    if (!cancelProjectDraft || !capabilities.canCancelProjects) return;
    const reason = cancelProjectDraft.reason.trim();
    if (!reason) {
      setCancelProjectDraft((current) => ({
        ...current,
        error: "Cancellation reason is required.",
      }));
      return;
    }

    const project = enrichedProjects.find((item) => item.id === cancelProjectDraft.projectId);
    if (!project) return;

    const timestamp = new Date().toISOString();
    const taskAction = cancelProjectDraft.taskAction || "lock-open-tasks";
    const nextProjects = normalizedProjects.map((item) =>
      item.id === project.id
        ? {
            ...item,
            status: "Cancelled",
            cancelledBy: currentUser.id,
            cancelledByName: currentUser.name,
            cancelledAt: timestamp,
            cancellationReason: reason,
            cancellationTaskAction: taskAction,
          }
        : item,
    );
    const nextTasks =
      taskAction === "cancel-open-tasks"
        ? normalizedTasks.map((task) =>
            task.projectId === project.id && !isTaskComplete(task) && task.status !== "Cancelled"
              ? {
                  ...task,
                  status: "Cancelled",
                  cancellationReason: reason,
                  cancellationTaskAction: taskAction,
                }
              : task,
          )
        : normalizedTasks;

    setProjects(nextProjects);
    setTasks(nextTasks);
    setComments((current) => [
      {
        id: createRecordId("comment"),
        projectId: project.id,
        taskId: "",
        body: `Project cancelled by ${currentUser.name}. Reason: ${reason}. Task action: ${getCancellationTaskActionLabel(taskAction)}.`,
        createdAt: timestamp,
        author: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          location: currentUser.location || currentUser.countryRegion || "",
        },
      },
      ...current,
    ]);

    const targetIds = [...new Set([project.managerId, ...(project.team || [])])].filter(
      (id) => id && ![currentUser.id, currentUser.employeeId].includes(id),
    );
    targetIds.forEach((targetUserId) => {
      addNotification({
        type: "project-cancelled",
        title: "Project marked as cancelled",
        message: `${project.name} was cancelled by ${currentUser.name}. Reason: ${reason}`,
        targetUserId,
        relatedProjectId: project.id,
      });
    });

    addAuditEvent("project", "Project cancelled", `${project.name} was cancelled. Reason: ${reason}`, {
      relatedProjectId: project.id,
    });

    setCancelProjectDraft(null);
  }

  // ---- Recycle Bin (soft delete) --------------------------------------------
  // Deleting a task or project moves it (with its tasks, for a project) into a
  // separate `trash` store instead of removing it for good. Management can
  // restore it or delete it permanently from the Recycle Bin view.
  function deleteTask(taskId) {
    if (!capabilities.canManageTasks) return;
    const task = tasks.find((item) => String(item.id) === String(taskId));
    if (!task) return;
    const project = projects.find((item) => item.id === task.projectId);
    setTasks((current) => current.filter((item) => String(item.id) !== String(taskId)));
    setTrash((current) => [
      {
        trashId: createRecordId("trash"),
        kind: "task",
        label: task.title || `Task ${task.id}`,
        context: project?.name || task.projectId || "",
        deletedAt: new Date().toISOString(),
        deletedBy: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        item: task,
      },
      ...current,
    ]);
    addAuditEvent("task", "Task moved to Recycle Bin", `${task.title || "Task"} was deleted by ${currentUser.name}.`, {
      relatedProjectId: task.projectId,
    });
  }

  function deleteProject(projectId) {
    if (!capabilities.canManageProjects) return;
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    const projectTasks = tasks.filter((item) => item.projectId === projectId);
    setProjects((current) => current.filter((item) => item.id !== projectId));
    setTasks((current) => current.filter((item) => item.projectId !== projectId));
    setTrash((current) => [
      {
        trashId: createRecordId("trash"),
        kind: "project",
        label: project.name || project.id,
        context: `${projectTasks.length} task${projectTasks.length === 1 ? "" : "s"}`,
        deletedAt: new Date().toISOString(),
        deletedBy: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
        item: project,
        tasks: projectTasks,
      },
      ...current,
    ]);
    if (selectedProjectId === projectId) {
      setActiveView("projects");
    }
    addAuditEvent(
      "project",
      "Project moved to Recycle Bin",
      `${project.name} and ${projectTasks.length} task(s) were deleted by ${currentUser.name}.`,
      { relatedProjectId: projectId },
    );
  }

  function restoreFromTrash(trashId) {
    if (!capabilities.canManageTrash) return;
    const entry = trash.find((item) => item.trashId === trashId);
    if (!entry) return;
    if (entry.kind === "project" && entry.item) {
      setProjects((current) =>
        current.some((p) => p.id === entry.item.id) ? current : [entry.item, ...current],
      );
      if (Array.isArray(entry.tasks) && entry.tasks.length) {
        setTasks((current) => {
          const ids = new Set(current.map((t) => String(t.id)));
          const restored = entry.tasks.filter((t) => !ids.has(String(t.id)));
          return [...restored, ...current];
        });
      }
    } else if (entry.kind === "task" && entry.item) {
      setTasks((current) =>
        current.some((t) => String(t.id) === String(entry.item.id))
          ? current
          : [entry.item, ...current],
      );
    }
    setTrash((current) => current.filter((item) => item.trashId !== trashId));
    addAuditEvent(entry.kind || "system", "Restored from Recycle Bin", `${entry.label} was restored by ${currentUser.name}.`);
  }

  function purgeTrashItem(trashId) {
    if (!capabilities.canManageTrash) return;
    const entry = trash.find((item) => item.trashId === trashId);
    setTrash((current) => current.filter((item) => item.trashId !== trashId));
    if (entry) {
      addAuditEvent(entry.kind || "system", "Permanently deleted", `${entry.label} was permanently deleted by ${currentUser.name}.`);
    }
  }

  function handleSubmitTaskReview(taskId) {
    const task = normalizedTasks.find((item) => item.id === taskId);
    if (!task || !capabilities.canSubmitTaskReview || task.approvalRequired) return;
    const project = enrichedProjects.find((item) => item.id === task.projectId);
    const currentPersonId = currentUser.employeeId || currentUser.id;
    if (task.assigneeId !== currentPersonId && !capabilities.canManageTasks) return;
    if (isProjectCancelled(project) && !capabilities.canManageProjects) return;

    const timestamp = new Date().toISOString();
    const nextTasks = normalizedTasks.map((item) =>
      item.id === taskId
        ? {
            ...item,
            status: "Pending Review",
            progress: Math.min(95, clampProgress(item.progress || 95)),
            qcStatus: "Pending Review",
            submittedForReviewBy: currentUser.id,
            submittedForReviewByName: currentUser.name,
            submittedForReviewAt: timestamp,
            reviewedBy: "",
            reviewedByName: "",
            reviewedAt: "",
            reviewComment: "",
          }
        : item,
    );
    setTasks(nextTasks);
    setProjects((currentProjects) =>
      syncProjectsWithTasks(normalizeProjectsForEmployees(currentProjects), nextTasks.filter(isPublishedTask)),
    );
    setComments((current) => [
      {
        id: createRecordId("comment"),
        projectId: task.projectId,
        taskId: task.id,
        body: `${currentUser.name} submitted "${task.title}" for Team Lead QC review.`,
        createdAt: timestamp,
        author: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          location: currentUser.location || currentUser.countryRegion || "",
        },
      },
      ...current,
    ]);
    addNotification({
      type: "qc-review",
      title: "Task submitted for Team Lead review",
      message: `${currentUser.name} submitted "${task.title}" for ${project?.name || task.projectId}.`,
      targetRoles: reviewNotificationRoles,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
      actionRequired: true,
    });
    addAuditEvent("review", "Task submitted for QC", `${task.title} was submitted for Team Lead review.`, {
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    });
  }

  function handleQcReview(taskId, action, note = "") {
    const task = normalizedTasks.find((item) => item.id === taskId);
    const project = enrichedProjects.find((item) => item.id === task?.projectId);
    const assignee = workspacePeople.find((employee) => employee.id === task?.assigneeId);
    if (!task || !capabilities.canReviewTasks || !canReviewTaskForUser(currentUser, task, project)) {
      return { ok: false, message: "You do not have permission to review this task." };
    }

    const trimmedNote = note.trim();
    if (action === "reject" && !trimmedNote) {
      return { ok: false, message: "Review comment is required before rejecting the task." };
    }

    const timestamp = new Date().toISOString();
    const accepted = action === "accept";
    const nextTasks = normalizedTasks.map((item) =>
      item.id === taskId
        ? {
            ...item,
            status: accepted ? "Completed" : "Needs Revision",
            progress: accepted ? 100 : Math.min(95, clampProgress(item.progress)),
            qcStatus: accepted ? "Accepted" : "Rejected",
            reviewedBy: currentUser.id,
            reviewedByName: currentUser.name,
            reviewedAt: timestamp,
            updatedAt: timestamp,
            completedAt: accepted ? timestamp : item.completedAt || "",
            reviewComment: accepted
              ? trimmedNote || "Accepted by Team Lead QC review."
              : trimmedNote,
            revisionCount: accepted ? Number(item.revisionCount || 0) : Number(item.revisionCount || 0) + 1,
            returnedToAssigneeAt: accepted ? item.returnedToAssigneeAt || "" : timestamp,
          }
        : item,
    );
    setTasks(nextTasks);
    setProjects((currentProjects) =>
      syncProjectsWithTasks(normalizeProjectsForEmployees(currentProjects), nextTasks.filter(isPublishedTask)),
    );
    setComments((current) => [
      {
        id: createRecordId("comment"),
        projectId: task.projectId,
        taskId: task.id,
        body: accepted
          ? `${currentUser.name} accepted "${task.title}" in Team Lead QC review.${trimmedNote ? ` Note: ${trimmedNote}` : ""}`
          : `${currentUser.name} rejected "${task.title}" for revision. Reason: ${trimmedNote}`,
        createdAt: timestamp,
        author: {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
          location: currentUser.location || currentUser.countryRegion || "",
        },
      },
      ...current,
    ]);
    addNotification({
      type: accepted ? "qc-accepted" : "qc-rejected",
      title: accepted ? "Task accepted by Team Lead" : "Task returned for revision",
      message: accepted
        ? `"${task.title}" was accepted and marked Completed.`
        : `"${task.title}" needs revision. Reason: ${trimmedNote}`,
      targetUserId: task.assigneeId,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
      actionRequired: !accepted,
    });

    addAuditEvent("review", accepted ? "QC accepted" : "QC rejected", `${task.title} was ${accepted ? "accepted" : "returned for revision"}.`, {
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    });

    return {
      ok: true,
      message: accepted
        ? `${task.title} was accepted and marked Completed.`
        : `${task.title} was returned to ${assignee?.name || "the assignee"} for revision.`,
    };
  }

  function addComment(projectId, taskId, body) {
    if (!body.trim() || !capabilities.canComment) return;
    const project = normalizedProjects.find((item) => item.id === projectId);
    const task = normalizedTasks.find((item) => item.id === Number(taskId));
    const nextComment = {
      id: createRecordId("comment"),
      projectId,
      taskId: taskId ? Number(taskId) : "",
      body: body.trim(),
      createdAt: new Date().toISOString(),
      author: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
        location: currentUser.location || currentUser.countryRegion || "",
      },
    };
    setComments((current) => [nextComment, ...current]);
    addAuditEvent("comment", "Comment added", `${currentUser.name} commented on ${task?.title || project?.name || projectId}.`, {
      relatedProjectId: projectId,
      relatedTaskId: task?.id || "",
    });

    const targetIds = [
      project?.managerId,
      task?.assigneeId,
      task?.createdBy?.id,
      task?.approvalOwnerId,
    ].filter((id) => id && id !== currentUser.id);
    [...new Set(targetIds)].forEach((targetUserId) => {
      addNotification({
        type: "comment",
        title: "New project comment",
        message: `${currentUser.name} commented on ${task?.title || project?.name || projectId}.`,
        targetUserId,
        relatedProjectId: projectId,
        relatedTaskId: task?.id,
      });
    });
  }

  function markNotificationRead(notificationId) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      ),
    );
  }

  function markAllNotificationsRead() {
    setNotifications((current) =>
      current.map((notification) =>
        canUserSeeNotification(currentUser, notification) ? { ...notification, read: true } : notification,
      ),
    );
  }

  function addProjectLink() {
    if (!linkDraft.title.trim() && !linkDraft.url.trim()) return;
    setProjectDraft((current) => ({
      ...current,
      dataLinks: [
        ...current.dataLinks,
        {
          id: Math.max(0, ...current.dataLinks.map((link) => link.id)) + 1,
          title: linkDraft.title || "Project Link",
          url: linkDraft.url,
        },
      ],
    }));
    setLinkDraft({ title: "", url: "" });
  }

  function toggleTeamMember(id) {
    setProjectDraft((current) => {
      const hasMember = current.team.includes(id);
      return {
        ...current,
        team: hasMember ? current.team.filter((memberId) => memberId !== id) : [...current.team, id],
      };
    });
  }

  function applyRequirementPrefix(prefix) {
    setProjectDraft((current) => {
      const spacer = current.requirements.trim() ? NEW_LINE : "";
      return { ...current, requirements: `${current.requirements}${spacer}${prefix}` };
    });
  }

  function createProject(event) {
    event.preventDefault();
    if (!capabilities.canCreateProjects) return;
    if (!projectDraft.name.trim()) return;
    const normalizedLinks = projectDraft.dataLinks.map((link) => ({
      ...link,
      url: normalizeUrl(link.url),
    }));
    const nextProject = {
      ...projectDraft,
      dataLinks: normalizedLinks,
      managerId: projectDraft.managerId,
      team: projectDraft.team.length ? projectDraft.team : [projectDraft.managerId],
    };
    setProjects((current) => [...current, nextProject]);
    setSelectedProjectId(nextProject.id);
    setTaskDraft((current) => ({ ...current, projectId: nextProject.id }));
    setProjectDraft(blankProject([...normalizedProjects, nextProject]));
    addAuditEvent("project", "Project created", `${nextProject.name} was created.`, {
      relatedProjectId: nextProject.id,
    });
    setActiveView("detail");
  }

  function resetWorkspaceData() {
    setProjects(initialProjects);
    setTasks(initialTasks);
    setNotifications([]);
    setComments([]);
    setAttendanceRecords([]);
    setAuditLog([]);
    setAuthUsers(teamUsers);
    setRemovedUserIds([]);
    setSelectedProjectId(initialProjects[0]?.id || "");
    setProjectFilters(defaultProjectFilters);
    setProjectDraft(blankProject(initialProjects));
    setTaskDraft(blankTask(initialProjects));
    setActiveView("dashboard");
  }

  // Run an export behind the LiDAR loader so the drone "captures" the data first.
  function runWithLoader(fn, label = "Generating file") {
    setLoader({ active: true, label });
    window.setTimeout(() => {
      try {
        fn();
      } finally {
        setLoader((current) => ({ ...current, active: false }));
      }
    }, 950);
  }

  function updateProjectFilter(key, value) {
    setProjectFilters((current) => ({ ...current, [key]: value }));
  }

  function clearProjectFilters() {
    setProjectFilters(defaultProjectFilters);
  }

  function isTaskLockedForCurrentUser(task) {
    const project = enrichedProjects.find((item) => item.id === task.projectId);
    return isProjectCancelled(project) && !capabilities.canManageProjects;
  }

  if (backendActive && !authReady) {
    return <LidarLoader label="Connecting to GEOSPATIAL HUB" />;
  }

  if (!currentUser) {
    return <LoginPage onLogin={login} rememberedIdentifier={rememberedIdentifier} />;
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}>
      {loader.active ? <LidarLoader label={loader.label} /> : null}
      <aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="brand-row">
          <div className="brand-block">
            <div className="brand-mark">
              <Database size={24} aria-hidden="true" />
            </div>
            <div className="brand-copy">
              <strong>GEOTECH 3D</strong>
              <span>Geospatial Hub</span>
            </div>
          </div>
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <SidebarOpen size={18} aria-hidden="true" />
            ) : (
              <SidebarClose size={18} aria-hidden="true" />
            )}
          </button>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {accessibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeView === item.id ? "active" : ""}
                type="button"
                key={item.id}
                onClick={() => setActiveView(item.id)}
                title={item.label}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="sidebar-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="sidebar-user" aria-label="Logged in user">
          <div className="sidebar-avatar">{getInitials(currentUser.name)}</div>
          <div className="sidebar-user-copy">
            <strong>{currentUser.name}</strong>
            <span>{currentUser.email}</span>
            <span>{currentUser.title}</span>
            {currentUser.countryRegion ? <span>{currentUser.countryRegion}</span> : null}
          </div>
          <Badge tone={getRoleTone(currentUser.role)}>{currentUser.badge || currentUser.role}</Badge>
        </section>

        <section className="sidebar-filters" aria-label="Project filters">
          <div className="sidebar-section-title">
            <div>
              <Filter size={16} aria-hidden="true" />
              <span>Project Filters</span>
            </div>
            <strong>
              {filteredProjects.length}/{activeRoleScopedProjects.length}
            </strong>
          </div>
          {cancelledRoleScopedProjects.length ? (
            <button className="archive-count-link" type="button" onClick={() => setActiveView("archive")}>
              <Archive size={14} aria-hidden="true" />
              {cancelledRoleScopedProjects.length} cancelled in archive
            </button>
          ) : null}

          <label className="sidebar-field">
            <span>Search</span>
            <div className="sidebar-input-icon">
              <Search size={15} aria-hidden="true" />
              <input
                value={projectFilters.search}
                onChange={(event) => updateProjectFilter("search", event.target.value)}
                placeholder="Name, client, ID"
              />
            </div>
          </label>

          <label className="sidebar-field">
            <span>Status</span>
            <select
              value={projectFilters.status}
              onChange={(event) => updateProjectFilter("status", event.target.value)}
            >
              <option value="All">All statuses</option>
              {statuses.map((status) => (
                <option value={status} key={status}>
                  {status === "Cancelled" ? "Cancelled (Project Archive)" : status}
                </option>
              ))}
            </select>
          </label>

          <label className="sidebar-field">
            <span>Priority</span>
            <select
              value={projectFilters.priority}
              onChange={(event) => updateProjectFilter("priority", event.target.value)}
            >
              <option value="All">All priorities</option>
              {priorities.map((priority) => (
                <option value={priority} key={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <button className="sidebar-clear" type="button" onClick={clearProjectFilters}>
            <RotateCcw size={15} aria-hidden="true" />
            Clear filters
          </button>
        </section>

        <div className="sidebar-bottom-actions">
          {capabilities.canManageSettings ? (
            <button className="ghost-button" type="button" onClick={resetWorkspaceData} title="Reset workspace data">
              <RotateCcw size={17} aria-hidden="true" />
              <span className="sidebar-label">Reset workspace data</span>
            </button>
          ) : null}
          <button className="ghost-button logout-button" type="button" onClick={logout} title="Logout">
            <LogOut size={17} aria-hidden="true" />
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <span className="eyebrow">GEOTECH 3D Â· Geospatial Hub</span>
            <h1>{accessibleNavItems.find((item) => item.id === activeView)?.label || "Dashboard"}</h1>
          </div>
          <div className="topbar-actions">
            <div className="topbar-user-summary">
              <strong>
                {currentUser.name}
                {currentUser.badge === "CEO" ? <span className="inline-ceo-badge">CEO</span> : null}
              </strong>
              <span>{currentUser.title}</span>
            </div>
            <Badge tone={getRoleTone(currentUser.role)}>
              <ShieldCheck size={14} aria-hidden="true" />
              {currentUser.badge || currentUser.role}
            </Badge>
            <StatusBadge value={selectedProject?.status || "Planning"} />
            {capabilities.canCreateProjects ? (
              <button className="primary-button" type="button" onClick={() => setActiveView("new")}>
                <Plus size={17} aria-hidden="true" />
                New Project
              </button>
            ) : null}
          </div>
        </header>

        {activeView === "dashboard" && canAccessView(currentUser, "dashboard") && (
          <Dashboard
            stats={dashboardStats}
            projects={filteredProjects}
            allProjectCount={activeRoleScopedProjects.length}
            archivedProjectCount={cancelledRoleScopedProjects.length}
            tasks={filteredTasks}
            employees={workspacePeople}
            workload={visibleWorkload}
            notifications={notificationItems}
            comments={comments}
            approvalQueue={approvalQueue}
            reviewQueue={reviewQueue}
            currentUser={currentUser}
            capabilities={capabilities}
            onOpenProject={openProject}
            onOpenReport={() => setActiveView("report")}
            onOpenCompanyReport={openCompanyReport}
          />
        )}

        {activeView === "report" && (
          <DailyReport
            report={dailyReport}
            currentUser={currentUser}
            onExportCsv={() =>
              runWithLoader(() => exportDailyReportCsv(dailyReport), "Generating daily report")
            }
            onPrint={printReport}
          />
        )}

        {activeView === "insights" && (
          <ReportsCenter
            dailyReport={dailyReport}
            weeklyReport={weeklyReport}
            projects={filteredProjects}
            tasks={filteredTasks}
            workload={visibleWorkload}
            onExportWeekly={() => runWithLoader(exportWeeklyReport, "Generating weekly report")}
            onPrint={printReport}
          />
        )}

        {activeView === "map" && canAccessView(currentUser, "map") && (
          <MapView
            projects={geoProjects}
            employees={workspacePeople}
            onOpenProject={openProject}
          />
        )}

        {activeView === "projects" && canAccessView(currentUser, "projects") && (
          <ProjectsPage
            projects={filteredProjects}
            allProjectCount={activeRoleScopedProjects.length}
            archivedProjectCount={cancelledRoleScopedProjects.length}
            employees={workspacePeople}
            tasks={filteredTasks}
            onOpenProject={openProject}
            onExport={runWithLoader}
          />
        )}

        {activeView === "archive" && canAccessView(currentUser, "archive") && (
          <ProjectArchivePage
            projects={filteredArchiveProjects}
            allArchiveCount={cancelledRoleScopedProjects.length}
            employees={workspacePeople}
            tasks={normalizedTasks}
            onOpenProject={openProject}
          />
        )}

        {activeView === "detail" && canAccessView(currentUser, "detail") && (
          <ProjectDetail
            project={selectedProject}
            employees={workspacePeople}
            tasks={selectedProjectTasks}
            onUpdateTask={updateTask}
            canEditTasks={
              (capabilities.canManageTasks || taskLevelRoles.includes(currentUser.role)) &&
              (!isProjectCancelled(selectedProject) || capabilities.canManageProjects)
            }
            canCancelProject={capabilities.canCancelProjects}
            onRequestCancelProject={openCancelProject}
            canDeleteProject={capabilities.canManageProjects}
            onDeleteProject={deleteProject}
            canDeleteTasks={capabilities.canManageTasks}
            onDeleteTask={deleteTask}
            canComment={capabilities.canComment}
            comments={selectedProjectComments}
            currentUser={currentUser}
            onAddComment={addComment}
            canSubmitTaskReview={capabilities.canSubmitTaskReview}
            canCompleteTasksDirectly={capabilities.canCompleteTasksDirectly}
            onSubmitTaskReview={handleSubmitTaskReview}
            isTaskLocked={isTaskLockedForCurrentUser}
            limitedView={taskLevelRoles.includes(currentUser.role)}
            onOpenGanttReport={openGanttReport}
          />
        )}

        {activeView === "company-report" && capabilities.canViewCompanyReport && (
          <CompanyReport
            projects={activeRoleScopedProjects}
            tasks={publishedTasks}
            employees={workspacePeople}
            currentUser={currentUser}
            onPrint={printReport}
            onBack={() => setActiveView("dashboard")}
          />
        )}

        {activeView === "project-report" && (
          <ProjectGanttReport
            project={selectedProject}
            tasks={selectedProjectTasks}
            employees={workspacePeople}
            currentUser={currentUser}
            onPrint={printReport}
            onBack={() => setActiveView("detail")}
          />
        )}

        {activeView === "tasks" && (
          <TasksPage
            taskDraft={taskDraft}
            setTaskDraft={setTaskDraft}
            onCreateTask={createTask}
            tasks={filteredTasks}
            projects={activeRoleScopedProjects}
            employees={workspacePeople}
            onUpdateTask={updateTask}
            canManageTasks={capabilities.canManageTasks}
            canDeleteTasks={capabilities.canManageTasks}
            onDeleteTask={deleteTask}
            canCreateTaskRequests={capabilities.canCreateTaskRequests}
            canSubmitTaskReview={capabilities.canSubmitTaskReview}
            canCompleteTasksDirectly={capabilities.canCompleteTasksDirectly}
            currentUser={currentUser}
            onSubmitTaskReview={handleSubmitTaskReview}
            isTaskLocked={isTaskLockedForCurrentUser}
            isPersonalTaskView={taskLevelRoles.includes(currentUser.role)}
            requestMessage={taskRequestMessage}
            onExport={runWithLoader}
          />
        )}

        {activeView === "review" && capabilities.canReviewTasks && (
          <ReviewQueuePage
            tasks={reviewQueue}
            projects={enrichedProjects}
            employees={workspacePeople}
            currentUser={currentUser}
            onReviewTask={handleQcReview}
          />
        )}

        {activeView === "gantt" && (
          <section className="panel">
            <SectionTitle icon={GanttChartSquare} title="Project Timeline" helper="Active project tasks drive this MVP Gantt view. Cancelled projects are kept in Project Archive." />
            <GanttChart tasks={filteredTasks} projects={filteredProjects} employees={workspacePeople} />
          </section>
        )}

        {activeView === "workload" && <WorkloadPage workload={visibleWorkload} tasks={filteredTasks} />}

        {activeView === "attendance" && (
          <AttendancePage
            records={visibleAttendanceRecords}
            currentUser={currentUser}
            canManageAttendance={capabilities.canManageAttendance || capabilities.canViewExecutiveDashboard}
            onCheckIn={handleAttendanceCheckIn}
            onCheckOut={handleAttendanceCheckOut}
            onUpdateNote={updateAttendanceNote}
            onExport={() => runWithLoader(exportAttendanceReport, "Exporting attendance")}
          />
        )}

        {activeView === "new" && capabilities.canCreateProjects && (
          <NewProjectPage
            projectDraft={projectDraft}
            setProjectDraft={setProjectDraft}
            linkDraft={linkDraft}
            setLinkDraft={setLinkDraft}
            onAddProjectLink={addProjectLink}
            onCreateProject={createProject}
            onToggleTeamMember={toggleTeamMember}
            onRequirementPrefix={applyRequirementPrefix}
            employees={workspacePeople}
          />
        )}

        {activeView === "approvals" && capabilities.canApproveTaskRequests && (
          <ApprovalCenter
            tasks={approvalQueue}
            projects={normalizedProjects}
            employees={workspacePeople}
            onApprovalAction={handleApprovalAction}
          />
        )}

        {activeView === "notifications" && (
          <NotificationsPage
            notifications={notificationItems}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
          />
        )}

        {activeView === "users" && (
          <UsersPage
            users={safeAuthUsers}
            currentUser={currentUser}
            onUpdateUserRole={updateUserRole}
            onAddUser={addUser}
            onRemoveUser={removeUser}
          />
        )}

        {activeView === "audit" && capabilities.canViewAuditLog && (
          <AuditLogPage events={visibleAuditLog} />
        )}

        {activeView === "trash" && capabilities.canManageTrash && (
          <TrashPage trash={trash} onRestore={restoreFromTrash} onPurge={purgeTrashItem} />
        )}

        {activeView === "settings" && capabilities.canManageSettings && <SettingsPage />}
      </main>
      {cancelProjectDraft ? (
        <CancelProjectModal
          draft={cancelProjectDraft}
          setDraft={setCancelProjectDraft}
          project={enrichedProjects.find((item) => item.id === cancelProjectDraft.projectId)}
          onCancel={() => setCancelProjectDraft(null)}
          onConfirm={confirmCancelProject}
        />
      ) : null}
    </div>
  );
}

function DailyReport({ report, currentUser, onExportCsv, onPrint }) {
  const dateLabel = new Date(`${report.dateStr}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="stack daily-report">
      <section className="panel report-sheet">
        <div className="report-header">
          <img src={geoBrandLogo} alt="GEOTECH 3D - Geospatial Hub" className="report-logo" />
          <div className="report-heading">
            <span className="eyebrow">Daily Productivity Report</span>
            <h2>Operations Daily Report</h2>
            <p>{dateLabel}</p>
          </div>
          <div className="report-actions no-print">
            <button className="secondary-button" type="button" onClick={onExportCsv}>
              <Download size={16} aria-hidden="true" /> Export CSV
            </button>
            <button className="secondary-button" type="button" onClick={onPrint}>
              <Printer size={16} aria-hidden="true" /> Print / PDF
            </button>
          </div>
        </div>

        <div className="report-kpi-row">
          <div className="report-kpi">
            <span>Projects Worked On</span>
            <strong>{report.projectsWorkedCount}</strong>
          </div>
          <div className="report-kpi">
            <span>Tasks Completed Today</span>
            <strong>{report.tasksCompletedCount}</strong>
          </div>
          <div className="report-kpi">
            <span>Avg Productivity Gain</span>
            <strong className="gain-text">+{report.avgGain}%</strong>
          </div>
          <div className="report-kpi">
            <span>Overall Completion</span>
            <strong>{report.overallProgress}%</strong>
          </div>
        </div>

        <div className="report-section-title">
          <TrendingUp size={18} aria-hidden="true" />
          <h3>Project Productivity Today</h3>
        </div>
        {report.worked.length ? (
          <table className="report-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Manager</th>
                <th>Start of Day</th>
                <th>Now</th>
                <th>Gain Today</th>
                <th>Done Today</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {report.worked.map((row) => (
                <tr key={row.projectId}>
                  <td>
                    <strong>{row.projectName}</strong>
                  </td>
                  <td>{row.managerName}</td>
                  <td>{row.base}%</td>
                  <td>{row.current}%</td>
                  <td>
                    <span className="gain-pill">+{row.gain}%</span>
                  </td>
                  <td>{row.doneTodayCount}</td>
                  <td>
                    <StatusBadge value={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No project movement recorded today"
            text="As teams update progress or complete tasks, today's gains will appear here."
          />
        )}

        <div className="report-section-title">
          <CheckCircle2 size={18} aria-hidden="true" />
          <h3>Tasks Completed Today</h3>
        </div>
        {report.completedToday.length ? (
          <ul className="report-completed-list">
            {report.completedToday.map((task) => (
              <li key={task.id}>
                <CheckCircle2 size={15} aria-hidden="true" className="done-ico" />
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {task.projectName} Â· {task.assigneeName}
                  </span>
                </div>
                <small>
                  {new Date(task.at).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No tasks completed yet today"
            text="Completed tasks will be listed here with their project, owner and time."
          />
        )}

        <div className="report-footer">
          <span>
            Generated by {currentUser?.name || "GEOTECH 3D"} Â· GEOTECH 3D Geospatial Hub
          </span>
        </div>
      </section>
    </div>
  );
}

function Dashboard({
  stats,
  projects,
  allProjectCount,
  archivedProjectCount,
  tasks,
  employees,
  workload,
  notifications,
  comments,
  approvalQueue,
  reviewQueue,
  currentUser,
  capabilities,
  onOpenProject,
  onOpenReport,
  onOpenCompanyReport,
}) {
  const busyPeople = workload.filter((employee) => ["Busy", "Overloaded"].includes(employee.status));
  const activeProjects = projects.filter((project) => ["Planning", "In Progress", "In Review"].includes(project.status));
  const delayedProjects = projects.filter((project) => project.status === "Delayed");
  const atRiskTasks = tasks
    .filter((task) => isOverdue(task) || ["Blocked", "Rejected", "Needs Revision"].includes(task.status))
    .sort((a, b) => getDaysUntil(a.end) - getDaysUntil(b.end))
    .slice(0, 5);
  const upcomingTasks = tasks
    .filter((task) => {
      const days = getDaysUntil(task.end);
      return !isTaskComplete(task) && task.status !== "Cancelled" && days >= 0 && days <= 14;
    })
    .sort((a, b) => getDaysUntil(a.end) - getDaysUntil(b.end))
    .slice(0, 5);
  const busiestPeople = [...workload]
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 4);
  const recentActivity = buildActivityTimeline(projects, tasks, comments, notifications).slice(0, 6);
  const criticalNotifications = notifications
    .filter((notification) => notification.actionRequired || notification.type === "critical")
    .slice(0, 4);

  return (
    <div className="stack">
      {capabilities.canViewExecutiveDashboard ? (
        <section className="executive-hero panel">
          <div>
            <span className="eyebrow">Executive Monitoring</span>
            <h2>
              {currentUser.role === ROLES.CEO || currentUser.role === ROLES.ROLE_CEO
                ? "CEO View Mode"
                : "Management Control Overview"}
            </h2>
            <p>
              Live project health, pending approvals, deadline risk, workload, and critical updates
              from the GEOTECH 3D workspace.
            </p>
            <div className="hero-actions no-print">
              <button className="report-cta" type="button" onClick={onOpenReport}>
                <FileText size={16} aria-hidden="true" />
                Daily Report
              </button>
              {capabilities.canViewCompanyReport ? (
                <button className="report-cta report-cta-outline" type="button" onClick={onOpenCompanyReport}>
                  <FileText size={16} aria-hidden="true" />
                  Company Report (PDF)
                </button>
              ) : null}
              <ExportBar onPrint={printReport} />
            </div>
          </div>
          <div className="executive-user-card">
            <strong>{currentUser.name}</strong>
            <Badge tone={getRoleTone(currentUser.role)}>{currentUser.badge || currentUser.role}</Badge>
            <span>{currentUser.accessType || currentUser.title}</span>
            {currentUser.countryRegion ? <small>{currentUser.countryRegion}</small> : null}
          </div>
        </section>
      ) : null}

      <div className="kpi-grid">
        <KpiCard icon={FolderKanban} label="Active Project Records" value={stats.totalProjects} helper="Cancelled projects are archived" tone="blue" />
        <KpiCard icon={Activity} label="Active Projects" value={stats.activeProjects} helper="Planning, delayed, or moving" tone="green" />
        <KpiCard icon={CircleAlert} label="Delayed Projects" value={stats.delayedProjects} helper="Deadline or blockage risk" tone="red" />
        <KpiCard icon={CircleAlert} label="At-Risk Tasks" value={stats.atRiskTasks} helper="Overdue, blocked, or rejected" tone="red" />
        <KpiCard icon={ClipboardCheck} label="Pending Approval" value={stats.pendingApprovals} helper="Task requests awaiting review" tone="amber" />
        <KpiCard icon={SquareCheckBig} label="Pending QC Review" value={stats.pendingReviews} helper="Tasks waiting for Team Lead acceptance" tone="amber" />
        <KpiCard icon={CalendarDays} label="Upcoming Deadlines" value={stats.upcomingDeadlines} helper="Due within 14 days" tone="amber" />
        <KpiCard icon={CheckCircle2} label="Completed Tasks" value={stats.completedTasks} helper={`${tasks.length} total tasks`} tone="purple" />
        <KpiCard icon={BarChart3} label="Average Progress" value={`${stats.avgProgress}%`} helper="Across all projects" tone="amber" />
        <KpiCard icon={Users} label="Team Utilization" value={`${stats.avgUtilization}%`} helper="Average visible workload" tone="green" />
        {capabilities.canViewExecutiveDashboard ? (
          <KpiCard icon={Archive} label="Project Archive" value={stats.archivedProjects} helper="Cancelled records preserved" tone="red" />
        ) : null}
      </div>

      {capabilities.canViewExecutiveDashboard ? (
        <section className="executive-grid">
          <div className="panel">
            <SectionTitle icon={BarChart3} title="Project Status Indicators" helper="Live operational status summary." />
            <div className="status-indicator-grid">
              <StatusMetric label="Active" value={activeProjects.length} />
              <StatusMetric label="Delayed" value={delayedProjects.length} />
              <StatusMetric label="Completed" value={projects.filter((project) => project.status === "Completed").length} />
              <StatusMetric label="Waiting for Data" value={stats.waitingForDataProjects} />
              <StatusMetric label="Pending Approval" value={stats.pendingApprovals} />
              <StatusMetric label="Pending Review" value={stats.pendingReviews} />
            </div>
          </div>

          <div className="panel">
            <SectionTitle icon={Bell} title="Critical Updates" helper="Unread alerts and action items." />
            <NotificationMiniList notifications={criticalNotifications} />
          </div>

          <div className="panel">
            <SectionTitle icon={CircleAlert} title="At-Risk Work" helper="Blocked, rejected, or overdue tasks requiring attention." />
            <RiskMiniList tasks={atRiskTasks} projects={projects} />
          </div>

          <div className="panel">
            <SectionTitle icon={ClipboardCheck} title="Approval Queue" helper="Requests waiting for Eng. Abdelrahman/Admin." />
            <ApprovalMiniList tasks={approvalQueue} />
          </div>

          <div className="panel">
            <SectionTitle icon={SquareCheckBig} title="QC Review Queue" helper="Submitted tasks waiting for Team Lead acceptance." />
            <ReviewMiniList tasks={reviewQueue} projects={projects} />
          </div>

          <div className="panel">
            <SectionTitle icon={Activity} title="Recent Activity Timeline" helper="Comments, approvals, task requests, and updates." />
            <ActivityTimeline events={recentActivity} compact />
          </div>

          <div className="panel">
            <SectionTitle icon={CalendarDays} title="Deadline Watch" helper="Near-term milestones and delivery pressure." />
            <DeadlineMiniList tasks={upcomingTasks} projects={projects} />
          </div>

          <div className="panel">
            <SectionTitle icon={Users} title="Workload Snapshot" helper="Highest utilization across the visible team." />
            <WorkloadMiniList people={busiestPeople} />
          </div>
        </section>
      ) : null}

      <section className="panel">
        <SectionTitle
          icon={BriefcaseBusiness}
          title="Project Overview"
          helper={`Showing ${projects.length} of ${allProjectCount} projects from the sidebar filters.`}
        />
        {archivedProjectCount ? (
          <div className="archive-inline-note">
            <Archive size={16} aria-hidden="true" />
            {archivedProjectCount} cancelled project{archivedProjectCount === 1 ? "" : "s"} moved to Project Archive.
          </div>
        ) : null}
        {projects.length ? (
          <div className="project-grid">
            {projects.map((project) => (
              <ProjectCard
                project={project}
                employees={employees}
                tasks={tasks}
                key={project.id}
                onOpen={onOpenProject}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No projects match these filters" text="Clear or adjust the sidebar filters to see projects again." />
        )}
      </section>

      <section className="panel">
        <SectionTitle icon={Users} title="Who is Busy?" helper="Calculated from active tasks against each person's capacity." />
        {busyPeople.length ? (
          <div className="workload-strip">
            {busyPeople.map((employee) => (
            <div className="workload-person" key={employee.id}>
              <strong>{employee.name}</strong>
              <span>{employee.title}</span>
              <small>{employee.department}</small>
              <small>{employee.actualRole}</small>
              <ProgressBar value={employee.utilization} />
              <StatusBadge value={employee.status} />
            </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No overloaded team members" text="Current task distribution is within available capacity." />
        )}
      </section>
    </div>
  );
}

function ProjectsPage({ projects, allProjectCount, archivedProjectCount, employees, tasks, onOpenProject, onExport }) {
  return (
    <section className="panel">
      <div className="panel-head-row">
        <SectionTitle
          icon={FolderKanban}
          title="Projects"
          helper={`Showing ${projects.length} active project${projects.length === 1 ? "" : "s"}${
            allProjectCount !== projects.length ? ` from ${allProjectCount} active records` : ""
          }.`}
        />
        <ExportBar
          onExportCsv={
            projects.length
              ? () => onExport(() => exportProjectsCsv(projects, tasks, employees), "Exporting projects")
              : undefined
          }
          csvLabel="Export CSV"
          onPrint={printReport}
        />
      </div>
      {archivedProjectCount ? (
        <div className="archive-inline-note">
          <Archive size={16} aria-hidden="true" />
          {archivedProjectCount} cancelled project{archivedProjectCount === 1 ? "" : "s"} moved to Project Archive.
        </div>
      ) : null}
      {projects.length ? (
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard
              project={project}
              employees={employees}
              tasks={tasks}
              key={project.id}
              onOpen={onOpenProject}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No matching projects" text="Use the project filters in the sidebar to broaden the results." />
      )}
    </section>
  );
}

function ProjectArchivePage({ projects, allArchiveCount, employees, tasks, onOpenProject }) {
  return (
    <section className="panel archive-panel">
      <SectionTitle
        icon={Archive}
        title="Project Archive"
        helper={`Showing ${projects.length} of ${allArchiveCount} cancelled project records. Archived data remains readable and preserved.`}
      />
      {projects.length ? (
        <div className="archive-grid">
          {projects.map((project) => {
            const manager = employees.find((employee) => employee.id === project.managerId);
            const projectTasks = tasks.filter((task) => task.projectId === project.id);
            const progress = Number(project.progress ?? calculateProjectProgress(project.id, projectTasks));
            return (
              <article className="archive-card" key={project.id}>
                <div className="archive-card-head">
                  <div>
                    <span className="eyebrow">{project.id}</span>
                    <h3>{project.name}</h3>
                    <p>{project.client || "No client recorded"}</p>
                  </div>
                  <StatusBadge value="Cancelled" />
                </div>
                <div className="archive-meta-grid">
                  <div>
                    <span>Original Timeline</span>
                    <strong>{formatDateRange(project.start, project.end)}</strong>
                  </div>
                  <div>
                    <span>Progress Snapshot</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div>
                    <span>Project Manager</span>
                    <strong>{manager?.name || "Unassigned"}</strong>
                  </div>
                  <div>
                    <span>Cancelled By</span>
                    <strong>{project.cancelledByName || "Unknown user"}</strong>
                  </div>
                  <div>
                    <span>Cancelled At</span>
                    <strong>{formatDateTime(project.cancelledAt)}</strong>
                  </div>
                  <div>
                    <span>Task Action</span>
                    <strong>{getCancellationTaskActionLabel(project.cancellationTaskAction)}</strong>
                  </div>
                </div>
                <ProgressBar value={progress} />
                <div className="archive-reason">
                  <strong>Cancellation reason</strong>
                  <p>{project.cancellationReason || "No cancellation reason recorded on this archived project."}</p>
                </div>
                <div className="archive-card-footer">
                  <span>{projectTasks.length} historical tasks preserved</span>
                  <button className="secondary-button" type="button" onClick={() => onOpenProject(project.id)}>
                    Open Detail
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No cancelled projects" text="Cancelled project records will appear here without being deleted from localStorage." />
      )}
    </section>
  );
}

function StatusMetric({ label, value }) {
  return (
    <div className="status-metric">
      <StatusBadge value={label} />
      <strong>{value}</strong>
    </div>
  );
}

function NotificationMiniList({ notifications }) {
  if (!notifications.length) {
    return <EmptyState title="No critical updates" text="No action-critical alerts are currently open." />;
  }

  return (
    <div className="mini-list">
      {notifications.map((notification) => (
        <div className="mini-list-item" key={notification.id}>
          <strong>{notification.title}</strong>
          <span>{notification.message}</span>
          <small>{formatDateTime(notification.createdAt)}</small>
        </div>
      ))}
    </div>
  );
}

function ApprovalMiniList({ tasks }) {
  if (!tasks.length) {
    return <EmptyState title="Approval queue clear" text="No pending approval requests right now." />;
  }

  return (
    <div className="mini-list">
      {tasks.slice(0, 4).map((task) => (
        <div className="mini-list-item" key={task.id}>
          <strong>{task.title}</strong>
          <span>
            {task.createdBy?.name || "Submitted user"} {"->"} {task.approvalOwner}
          </span>
          <StatusBadge value={task.approvalStatus || "Pending Approval"} />
        </div>
      ))}
    </div>
  );
}

function ReviewMiniList({ tasks, projects }) {
  if (!tasks.length) {
    return <EmptyState title="QC queue clear" text="No tasks are waiting for Team Lead review right now." />;
  }

  return (
    <div className="mini-list">
      {tasks.slice(0, 4).map((task) => {
        const project = projects.find((item) => item.id === task.projectId);
        return (
          <div className="mini-list-item" key={task.id}>
            <strong>{task.title}</strong>
            <span>{project?.name || task.projectId}</span>
            <small>Submitted by {task.submittedForReviewByName || "team member"}</small>
            <StatusBadge value="Pending Review" />
          </div>
        );
      })}
    </div>
  );
}

function RiskMiniList({ tasks, projects }) {
  if (!tasks.length) {
    return <EmptyState title="No at-risk tasks" text="No blocked, rejected, or overdue work is visible right now." />;
  }

  return (
    <div className="mini-list">
      {tasks.map((task) => {
        const project = projects.find((item) => item.id === task.projectId);
        const days = getDaysUntil(task.end);
        const dueText = days < 0 ? `${Math.abs(days)} days overdue` : `Due in ${days} days`;
        return (
          <div className="mini-list-item risk-list-item" key={task.id}>
            <div className="mini-list-row">
              <strong>{task.title}</strong>
              <StatusBadge value={task.status} />
            </div>
            <span>{project?.name || task.projectId}</span>
            <small>
              {dueText} - {formatShortDate(task.end)}
            </small>
          </div>
        );
      })}
    </div>
  );
}

function DeadlineMiniList({ tasks, projects }) {
  if (!tasks.length) {
    return <EmptyState title="No near deadlines" text="No visible tasks are due in the next 14 days." />;
  }

  return (
    <div className="mini-list">
      {tasks.map((task) => {
        const project = projects.find((item) => item.id === task.projectId);
        const days = getDaysUntil(task.end);
        return (
          <div className="mini-list-item" key={task.id}>
            <div className="mini-list-row">
              <strong>{task.title}</strong>
              <Badge tone={days <= 3 ? "danger" : "warning"}>{days === 0 ? "Due today" : `${days}d`}</Badge>
            </div>
            <span>{project?.name || task.projectId}</span>
            <small>{formatShortDate(task.end)}</small>
          </div>
        );
      })}
    </div>
  );
}

function WorkloadMiniList({ people }) {
  if (!people.length) {
    return <EmptyState title="No workload data" text="Visible team utilization will appear once tasks are assigned." />;
  }

  return (
    <div className="mini-list">
      {people.map((person) => (
        <div className="mini-list-item" key={person.id}>
          <div className="mini-list-row">
            <strong>{person.name}</strong>
            <StatusBadge value={person.status} />
          </div>
          <ProgressBar value={person.utilization} />
          <small>
            {person.activeTasks} active tasks / {person.capacity} capacity
          </small>
        </div>
      ))}
    </div>
  );
}

function buildActivityTimeline(projects, tasks, comments, notifications) {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const events = [];

  projects.forEach((project) => {
    if (project.cancelledAt) {
      events.push({
        id: `project-cancelled-${project.id}`,
        type: "Project cancelled",
        title: project.name,
        description: `${project.cancelledByName || "Workspace user"} cancelled the project. ${
          project.cancellationReason || "No reason recorded."
        }`,
        createdAt: project.cancelledAt,
        status: "Cancelled",
      });
    }
  });

  tasks.forEach((task) => {
    if (task.createdAt || task.submittedAt) {
      events.push({
        id: `task-created-${task.id}`,
        type: task.approvalRequired ? "Task request" : "Task created",
        title: task.title,
        description: `${task.createdBy?.name || "System"} submitted work for ${
          projectMap.get(task.projectId)?.name || task.projectId
        }`,
        createdAt: task.submittedAt || task.createdAt,
        status: task.approvalStatus || task.status,
      });
    }
    if (task.approvedAt) {
      events.push({
        id: `task-approved-${task.id}`,
        type: "Task approved",
        title: task.title,
        description: `Approved by ${task.approvedBy || "approval owner"}`,
        createdAt: task.approvedAt,
        status: "Approved",
      });
    }
    if (task.rejectedAt) {
      events.push({
        id: `task-rejected-${task.id}`,
        type: "Task rejected",
        title: task.title,
        description: task.rejectionReason || "Rejected by approval owner",
        createdAt: task.rejectedAt,
        status: "Rejected",
      });
    }
    if (task.modificationRequestedAt) {
      events.push({
        id: `task-modified-${task.id}`,
        type: "Modification requested",
        title: task.title,
        description: task.modificationNote || "Revision required",
        createdAt: task.modificationRequestedAt,
        status: "Modification Requested",
      });
    }
    if (task.submittedForReviewAt) {
      events.push({
        id: `task-qc-submitted-${task.id}`,
        type: "Submitted for QC review",
        title: task.title,
        description: `${task.submittedForReviewByName || "Team member"} submitted work for Team Lead review.`,
        createdAt: task.submittedForReviewAt,
        status: "Pending Review",
      });
    }
    if (task.reviewedAt) {
      events.push({
        id: `task-qc-reviewed-${task.id}`,
        type: task.qcStatus === "Accepted" ? "QC accepted" : "QC rejected",
        title: task.title,
        description: task.reviewComment || `Reviewed by ${task.reviewedByName || "Team Lead"}`,
        createdAt: task.reviewedAt,
        status: task.qcStatus === "Accepted" ? "QC Accepted" : "QC Rejected",
      });
    }
  });

  comments.forEach((comment) => {
    events.push({
      id: `comment-${comment.id}`,
      type: "Comment added",
      title: comment.author?.name || "Comment",
      description: comment.body,
      createdAt: comment.createdAt,
      status: "Active",
    });
  });

  notifications.forEach((notification) => {
    events.push({
      id: `notification-${notification.id}`,
      type: notification.type,
      title: notification.title,
      description: notification.message,
      createdAt: notification.createdAt,
      status: notification.actionRequired ? "Pending Approval" : "Active",
    });
  });

  return events
    .filter((event) => event.createdAt)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function ActivityTimeline({ events, compact = false }) {
  if (!events.length) {
    return <EmptyState title="No activity yet" text="Project activity will appear here as the team works." />;
  }

  return (
    <div className={`activity-timeline ${compact ? "activity-timeline-compact" : ""}`}>
      {events.map((event) => (
        <div className="activity-event" key={event.id}>
          <div className="activity-dot" />
          <div>
            <span>{event.type}</span>
            <strong>{event.title}</strong>
            <p>{event.description}</p>
            <small>{formatDateTime(event.createdAt)}</small>
          </div>
          {event.status ? <StatusBadge value={event.status} /> : null}
        </div>
      ))}
    </div>
  );
}

function ProjectActivityTimeline({ project, tasks, comments }) {
  const events = buildActivityTimeline([project], tasks, comments, []);
  return (
    <section className="panel">
      <SectionTitle icon={Activity} title="Project Activity Timeline" helper="Project updates, approvals, and comments." />
      <ActivityTimeline events={events} />
    </section>
  );
}

function ProjectComments({ project, tasks, comments, currentUser, canComment, onAddComment }) {
  const [commentBody, setCommentBody] = useState("");
  const [taskId, setTaskId] = useState("");

  function submitComment(event) {
    event.preventDefault();
    onAddComment(project.id, taskId, commentBody);
    setCommentBody("");
    setTaskId("");
  }

  return (
    <section className="panel">
      <SectionTitle
        icon={MessageSquare}
        title="Comments & Feedback"
        helper="Project and task notes with author, role, location, and timestamp."
      />
      {canComment ? (
        <form className="comment-form" onSubmit={submitComment}>
          <Field label="Related task">
            <select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
              <option value="">Project level comment</option>
              {tasks.map((task) => (
                <option value={task.id} key={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Comment">
            <textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder={`Add a follow-up note as ${currentUser.name}`}
              rows="4"
            />
          </Field>
          <button className="primary-button" type="submit">
            <Send size={16} aria-hidden="true" />
            Add Comment
          </button>
        </form>
      ) : null}

      {comments.length ? (
        <div className="comment-list">
          {comments.map((comment) => {
            const task = tasks.find((item) => item.id === comment.taskId);
            return (
              <article className="comment-card" key={comment.id}>
                <div>
                  <strong>{comment.author?.name}</strong>
                  <span>
                    {comment.author?.role}
                    {comment.author?.location ? ` - ${comment.author.location}` : ""}
                  </span>
                </div>
                <p>{comment.body}</p>
                <small>
                  {task ? `${task.title} - ` : ""}
                  {formatDateTime(comment.createdAt)}
                </small>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No comments yet" text="Comments and follow-up notes will appear here." />
      )}
    </section>
  );
}

function ApprovalCenter({ tasks, projects, employees, onApprovalAction }) {
  const [notes, setNotes] = useState({});

  if (!tasks.length) {
    return (
      <section className="panel">
        <SectionTitle icon={ClipboardCheck} title="Approval Center" helper="Task requests routed to Eng. Abdelrahman." />
        <EmptyState title="No pending requests" text="The approval queue is currently clear." />
      </section>
    );
  }

  return (
    <section className="panel">
      <SectionTitle
        icon={ClipboardCheck}
        title="Approval Center"
        helper="Approve, reject, or request modifications before work reaches execution teams."
      />
      <div className="approval-grid">
        {tasks.map((task) => {
          const project = projects.find((item) => item.id === task.projectId);
          const assignee = employees.find((employee) => employee.id === task.assigneeId);
          const note = notes[task.id] || "";
          const decisionAt =
            task.approvedAt ||
            task.rejectedAt ||
            task.modificationRequestedAt ||
            task.submittedAt ||
            task.createdAt;
          return (
            <article className="approval-card" key={task.id}>
              <div className="approval-card-head">
                <div>
                  <span className="eyebrow">{project?.id || task.projectId}</span>
                  <h3>{task.title}</h3>
                  <p>{project?.name || "Project not found"}</p>
                </div>
                <StatusBadge value={task.approvalStatus || "Pending Approval"} />
              </div>
              <div className="approval-meta-grid">
                <div>
                  <span>Submitted by</span>
                  <strong>{task.createdBy?.name || "Unknown"}</strong>
                  <small>{task.createdBy?.role}</small>
                </div>
                <div>
                  <span>Submitted</span>
                  <strong>{formatShortDate(task.submittedAt || task.createdAt)}</strong>
                  <small>{formatDateTime(task.submittedAt || task.createdAt)}</small>
                </div>
                <div>
                  <span>Assignee</span>
                  <strong>{assignee?.name || "Unassigned"}</strong>
                  <small>{assignee?.title}</small>
                </div>
                <div>
                  <span>Deadline</span>
                  <strong>{formatShortDate(task.end)}</strong>
                  <small>
                    {task.priority} priority - {getDaysUntil(task.end) < 0 ? "Overdue" : `${getDaysUntil(task.end)} days left`}
                  </small>
                </div>
                <div>
                  <span>Approval owner</span>
                  <strong>{task.approvalOwner || "Eng. Abdelrahman Soliman"}</strong>
                  <small>{task.approvalOwnerId || APPROVAL_OWNER_ID}</small>
                </div>
                <div>
                  <span>Last decision</span>
                  <strong>{task.approvalStatus || "Pending Approval"}</strong>
                  <small>{formatDateTime(decisionAt)}</small>
                </div>
              </div>
              {task.approvalNote || task.rejectionReason || task.modificationNote ? (
                <div className="approval-note">
                  <strong>Decision note</strong>
                  <span>{task.approvalNote || task.rejectionReason || task.modificationNote}</span>
                </div>
              ) : null}
              <textarea
                value={note}
                onChange={(event) => setNotes((current) => ({ ...current, [task.id]: event.target.value }))}
                placeholder="Approval, rejection, or modification note"
                rows="3"
              />
              <div className="approval-actions">
                <button className="primary-button" type="button" onClick={() => onApprovalAction(task.id, "approve", note)}>
                  Approve
                </button>
                <button className="secondary-button" type="button" onClick={() => onApprovalAction(task.id, "modify", note)}>
                  Request Modifications
                </button>
                <button className="danger-button" type="button" onClick={() => onApprovalAction(task.id, "reject", note)}>
                  Reject
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ReviewQueuePage({ tasks, projects, employees, currentUser, onReviewTask }) {
  const [notes, setNotes] = useState({});
  const [message, setMessage] = useState(null);

  function runReview(taskId, action) {
    const result = onReviewTask(taskId, action, notes[taskId] || "");
    setMessage({
      tone: result?.ok ? "success" : "error",
      text: result?.message || "Review action could not be completed.",
    });
    if (result?.ok) {
      setNotes((current) => ({ ...current, [taskId]: "" }));
    }
  }

  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <SquareCheckBig size={20} aria-hidden="true" />
          <h2>Review Queue</h2>
        </div>
        <p>Team Lead QC acceptance is required before submitted work becomes Completed.</p>
      </div>

      {message ? <div className={`management-message management-message-${message.tone}`}>{message.text}</div> : null}

      {tasks.length ? (
        <div className="approval-grid review-grid">
          {tasks.map((task) => {
            const project = projects.find((item) => item.id === task.projectId);
            const assignee = employees.find((employee) => employee.id === task.assigneeId);
            const note = notes[task.id] || "";
            return (
              <article className="approval-card review-card" key={task.id}>
                <div className="approval-card-head">
                  <div>
                    <span className="eyebrow">{project?.id || task.projectId}</span>
                    <h3>{task.title}</h3>
                    <p>{project?.name || "Project not found"}</p>
                  </div>
                  <StatusBadge value="Pending Review" />
                </div>

                <div className="approval-meta-grid">
                  <div>
                    <span>Assignee</span>
                    <strong>{assignee?.name || "Unassigned"}</strong>
                    <small>{assignee?.title || "No title"}</small>
                  </div>
                  <div>
                    <span>Submitted by</span>
                    <strong>{task.submittedForReviewByName || "Team member"}</strong>
                    <small>{formatDateTime(task.submittedForReviewAt)}</small>
                  </div>
                  <div>
                    <span>Current Status</span>
                    <strong>{task.status}</strong>
                    <small>Progress {task.progress}%</small>
                  </div>
                  <div>
                    <span>Revision Count</span>
                    <strong>{Number(task.revisionCount || 0)}</strong>
                    <small>{task.qcStatus || "Pending Review"}</small>
                  </div>
                  <div>
                    <span>Reviewer</span>
                    <strong>{currentUser.name}</strong>
                    <small>{currentUser.title}</small>
                  </div>
                  <div>
                    <span>Deadline</span>
                    <strong>{formatShortDate(task.end)}</strong>
                    <small>{getDaysUntil(task.end) < 0 ? "Overdue" : `${getDaysUntil(task.end)} days left`}</small>
                  </div>
                </div>

                {task.notes ? (
                  <div className="approval-note">
                    <strong>Task notes</strong>
                    <span>{task.notes}</span>
                  </div>
                ) : null}

                <textarea
                  value={note}
                  onChange={(event) => setNotes((current) => ({ ...current, [task.id]: event.target.value }))}
                  placeholder="Acceptance note or required rejection reason"
                  rows="3"
                />
                <div className="approval-actions">
                  <button className="primary-button" type="button" onClick={() => runReview(task.id, "accept")}>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Accept & Complete
                  </button>
                  <button className="danger-button" type="button" onClick={() => runReview(task.id, "reject")}>
                    <CircleAlert size={16} aria-hidden="true" />
                    Reject / Needs Revision
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Review queue clear" text="Submitted tasks waiting for Team Lead QC will appear here." />
      )}
    </section>
  );
}

function CancelProjectModal({ draft, setDraft, project, onCancel, onConfirm }) {
  if (!project) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="confirm-modal cancel-project-modal panel" onSubmit={onConfirm} noValidate>
        <div className="modal-title-row">
          <div>
            <span className="eyebrow">Safe Cancellation</span>
            <h3>Cancel Project</h3>
          </div>
          <button className="icon-button" type="button" aria-label="Close cancel project modal" onClick={onCancel}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="danger-callout">
          <CircleAlert size={20} aria-hidden="true" />
          <div>
            <strong>{project.name}</strong>
            <p>
              This will mark the project as Cancelled. The project, tasks, comments, workload
              references, and history will remain readable in this local workspace.
            </p>
          </div>
        </div>

        <Field label="Cancellation reason">
          <textarea
            value={draft.reason}
            onChange={(event) =>
              setDraft((current) => ({ ...current, reason: event.target.value, error: "" }))
            }
            placeholder="Explain why this project is being cancelled"
            rows="4"
            required
          />
        </Field>

        <Field label="Open task handling">
          <select
            value={draft.taskAction}
            onChange={(event) => setDraft((current) => ({ ...current, taskAction: event.target.value }))}
          >
            {cancellationTaskActions.map((action) => (
              <option value={action.value} key={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </Field>

        {draft.error ? <div className="management-message management-message-error">{draft.error}</div> : null}

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            No, Keep Active
          </button>
          <button className="danger-button" type="submit">
            Confirm Cancellation
          </button>
        </div>
      </form>
    </div>
  );
}

function NotificationsPage({ notifications, onMarkRead, onMarkAllRead }) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const actionRequiredNotifications = notifications.filter((notification) => notification.actionRequired);
  const updateNotifications = notifications.filter((notification) => !notification.actionRequired);

  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <Bell size={20} aria-hidden="true" />
          <h2>Notification Center</h2>
        </div>
        <p>{unreadCount} unread updates, approvals, comments, and alerts.</p>
        <button className="secondary-button" type="button" onClick={onMarkAllRead}>
          Mark all read
        </button>
      </div>

      {notifications.length ? (
        <div className="stack">
          <div className="notification-summary">
            <div>
              <span>Unread</span>
              <strong>{unreadCount}</strong>
            </div>
            <div>
              <span>Action Required</span>
              <strong>{actionRequiredNotifications.length}</strong>
            </div>
            <div>
              <span>Total Updates</span>
              <strong>{notifications.length}</strong>
            </div>
          </div>
          <NotificationGroup
            title="Action Required"
            notifications={actionRequiredNotifications}
            emptyText="No approval or critical actions are waiting."
            onMarkRead={onMarkRead}
          />
          <NotificationGroup
            title="Updates"
            notifications={updateNotifications}
            emptyText="No informational updates are currently visible."
            onMarkRead={onMarkRead}
          />
        </div>
      ) : (
        <EmptyState title="No notifications" text="Approval alerts, comments, and critical updates will appear here." />
      )}
    </section>
  );
}

function NotificationGroup({ title, notifications, emptyText, onMarkRead }) {
  return (
    <div className="notification-group">
      <div className="notification-group-title">
        <strong>{title}</strong>
        <span>{notifications.length}</span>
      </div>
      {notifications.length ? (
        <div className="notification-list">
          {notifications.map((notification) => (
            <article className={`notification-card ${notification.read ? "" : "notification-unread"}`} key={notification.id}>
              <div>
                <div className="notification-card-headline">
                  <StatusBadge value={notification.actionRequired ? "Pending Approval" : "Active"} />
                  <Badge tone={notification.read ? "neutral" : "warning"}>{notification.read ? "Read" : "Unread"}</Badge>
                </div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                <small>
                  {formatDateTime(notification.createdAt)}
                  {notification.relatedProjectId ? ` - ${notification.relatedProjectId}` : ""}
                </small>
              </div>
              <button className="secondary-button" type="button" onClick={() => onMarkRead(notification.id)}>
                {notification.read ? "Read" : "Mark read"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={`No ${title.toLowerCase()}`} text={emptyText} />
      )}
    </div>
  );
}

function TrashPage({ trash, onRestore, onPurge }) {
  return (
    <div className="stack">
      <section className="panel">
        <SectionTitle
          icon={Trash2}
          title="Recycle Bin"
          helper="Deleted projects and tasks are kept here safely. Restore them, or delete permanently. Visible to management only."
        />
        {trash.length === 0 ? (
          <EmptyState
            title="Recycle Bin is empty"
            text="When you delete a project or task it will be moved here instead of being lost."
          />
        ) : (
          <div className="table-shell">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Details</th>
                  <th>Deleted by</th>
                  <th>When</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {trash.map((entry) => (
                  <tr key={entry.trashId}>
                    <td>
                      <Badge tone={entry.kind === "project" ? "warning" : "neutral"}>
                        {entry.kind === "project" ? "Project" : "Task"}
                      </Badge>
                    </td>
                    <td>
                      <strong>{entry.label}</strong>
                    </td>
                    <td>
                      <small>{entry.context}</small>
                    </td>
                    <td>{entry.deletedBy?.name || "—"}</td>
                    <td>
                      <small>{formatDateTime(entry.deletedAt)}</small>
                    </td>
                    <td>
                      <div className="task-action-stack">
                        <button
                          className="primary-button compact-button"
                          type="button"
                          onClick={() => onRestore(entry.trashId)}
                        >
                          <RotateCcw size={14} aria-hidden="true" />
                          Restore
                        </button>
                        <button
                          className="danger-button compact-button"
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Permanently delete "${entry.label}"? This cannot be undone.`,
                              )
                            ) {
                              onPurge(entry.trashId);
                            }
                          }}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          Delete forever
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ProjectDetail({
  project,
  employees,
  tasks,
  onUpdateTask,
  canEditTasks,
  canCancelProject,
  onRequestCancelProject,
  canDeleteProject,
  onDeleteProject,
  canDeleteTasks,
  onDeleteTask,
  canComment,
  comments,
  currentUser,
  onAddComment,
  canSubmitTaskReview,
  canCompleteTasksDirectly,
  onSubmitTaskReview,
  isTaskLocked,
  limitedView,
  onOpenGanttReport,
}) {
  if (!project) {
    return <EmptyState title="No project selected" text="Create or select a project to view details." />;
  }

  const manager = employees.find((employee) => employee.id === project.managerId);
  const projectTeam = employees.filter((employee) => project.team.includes(employee.id));

  return (
    <div className="stack">
      {isProjectCancelled(project) ? (
        <section className="cancelled-project-banner">
          <div>
            <Archive size={22} aria-hidden="true" />
            <div>
              <strong>This project has been cancelled</strong>
              <p>{project.cancellationReason || "No cancellation reason recorded."}</p>
            </div>
          </div>
          <div>
            <span>Cancelled by</span>
            <strong>{project.cancelledByName || "Unknown user"}</strong>
            <small>{formatDateTime(project.cancelledAt)}</small>
          </div>
        </section>
      ) : null}

      <section className="detail-header">
        <div>
          <span className="eyebrow">{project.id}</span>
          <h2>{project.name}</h2>
          <p>{project.client}</p>
          <button
            className="report-cta detail-report-cta no-print"
            type="button"
            onClick={() => onOpenGanttReport(project.id)}
          >
            <GanttChartSquare size={16} aria-hidden="true" />
            Gantt Report (PDF)
          </button>
        </div>
        <div className="detail-status">
          <StatusBadge value={project.status} />
          <ProgressBar value={project.progress} />
          {isProjectCancelled(project) ? (
            <div className="cancellation-summary">
              <strong>Project Cancelled</strong>
              <span>{project.cancellationReason || "No reason recorded."}</span>
              <small>
                {project.cancelledByName || "Unknown user"} - {formatDateTime(project.cancelledAt)}
              </small>
              <small>{getCancellationTaskActionLabel(project.cancellationTaskAction)}</small>
            </div>
          ) : canCancelProject ? (
            <button className="danger-button" type="button" onClick={() => onRequestCancelProject(project.id)}>
              <CircleAlert size={16} aria-hidden="true" />
              Cancel Project
            </button>
          ) : null}
          {canDeleteProject ? (
            <button
              className="danger-button no-print"
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete "${project.name}" and its tasks? It will be moved to the Recycle Bin, not lost.`,
                  )
                ) {
                  onDeleteProject(project.id);
                }
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete Project
            </button>
          ) : null}
        </div>
      </section>

      <div className="detail-grid">
        {limitedView ? (
          <section className="panel">
            <SectionTitle
              icon={ClipboardList}
              title="Limited Project Summary"
              helper={`Managed by ${manager?.name || "Unassigned"}`}
            />
            <div className="limited-info-grid">
              <div>
                <span>Client</span>
                <strong>{project.client || "Not set"}</strong>
              </div>
              <div>
                <span>Timeline</span>
                <strong>
                  {project.start} to {project.end}
                </strong>
              </div>
              <div>
                <span>Your visible tasks</span>
                <strong>{tasks.length}</strong>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="panel">
              <SectionTitle icon={ClipboardList} title="Requirements" helper={`Managed by ${manager?.name || "Unassigned"}`} />
              <FormattedRequirements text={project.requirements} />
            </section>

            <section className="panel">
              <SectionTitle icon={Link2} title="Project Data Links" helper="Links open in a new browser tab." />
              <DataLinksBar links={project.dataLinks} />
            </section>
          </>
        )}
      </div>

      <section className="panel">
        <SectionTitle icon={Users} title="Team Members" helper={`${projectTeam.length} assigned people`} />
        <div className="team-grid">
          {projectTeam.map((member) => (
            <div className="team-member" key={member.id}>
              <strong>{member.name}</strong>
              <span>{member.title}</span>
              <small>{member.department}</small>
              <small>{member.actualRole}</small>
              <small>{member.username}</small>
              <small>{member.email}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionTitle
          icon={ListChecks}
          title={limitedView ? "Your Project Tasks" : "Project Task Table"}
          helper={
            canEditTasks
              ? "Inline edits update project status and progress automatically."
              : "Read-only task access for your role."
          }
        />
        <TaskTable
          tasks={tasks}
          projects={[project]}
          employees={employees}
          onUpdateTask={onUpdateTask}
          readOnly={!canEditTasks}
          currentUser={currentUser}
          canSubmitTaskReview={canSubmitTaskReview}
          canCompleteTasksDirectly={canCompleteTasksDirectly}
          canManageTaskStructure={canEditTasks && !limitedView}
          canDeleteTasks={canDeleteTasks}
          onDeleteTask={onDeleteTask}
          onSubmitTaskReview={onSubmitTaskReview}
          isTaskLocked={isTaskLocked}
        />
      </section>

      <ProjectActivityTimeline project={project} tasks={tasks} comments={comments} />

      <ProjectComments
        project={project}
        tasks={tasks}
        comments={comments}
        currentUser={currentUser}
        canComment={canComment}
        onAddComment={onAddComment}
      />
    </div>
  );
}

function TasksPage({
  taskDraft,
  setTaskDraft,
  onCreateTask,
  tasks,
  projects,
  employees,
  onUpdateTask,
  canManageTasks,
  canDeleteTasks,
  onDeleteTask,
  canCreateTaskRequests,
  canSubmitTaskReview,
  canCompleteTasksDirectly,
  currentUser,
  onSubmitTaskReview,
  isTaskLocked,
  isPersonalTaskView,
  requestMessage,
  onExport,
}) {
  const canUseTaskForm = canManageTasks || canCreateTaskRequests;
  const canEditVisibleTasks = canManageTasks || isPersonalTaskView;

  // Focused daily summary for team members: how much is on my plate today?
  const todayIso = new Date().toISOString().slice(0, 10);
  const myOpenTasks = tasks.filter((task) => !isTaskComplete(task) && task.status !== "Cancelled");
  const myDayStats = {
    open: myOpenTasks.length,
    dueToday: myOpenTasks.filter((task) => task.end === todayIso).length,
    overdue: myOpenTasks.filter((task) => isOverdue(task)).length,
    inReview: tasks.filter(
      (task) => task.qcStatus === "Pending Review" || task.status === "Pending Review",
    ).length,
    completed: tasks.filter(isTaskComplete).length,
  };

  return (
    <div className="stack">
      {isPersonalTaskView ? (
        <div className="kpi-grid">
          <KpiCard icon={ListChecks} label="My Open Tasks" value={myDayStats.open} helper="Assigned to you" tone="blue" />
          <KpiCard icon={CalendarDays} label="Due Today" value={myDayStats.dueToday} helper="Finish these first" tone="amber" />
          <KpiCard icon={CircleAlert} label="Overdue" value={myDayStats.overdue} helper="Needs immediate attention" tone="red" />
          <KpiCard icon={SquareCheckBig} label="Waiting QC Review" value={myDayStats.inReview} helper="With your Team Lead" tone="amber" />
          <KpiCard icon={CheckCircle2} label="Completed" value={myDayStats.completed} helper="Reviewed and done" tone="green" />
        </div>
      ) : null}
      {canUseTaskForm ? (
        <section className="panel">
          <SectionTitle
            icon={PlusCircle}
            title={canCreateTaskRequests && !canManageTasks ? "Create Task Request" : "Create Task"}
            helper={
              canCreateTaskRequests && !canManageTasks
                ? "Requests are routed to Eng. Abdelrahman for approval before execution teams see them."
                : "Task data can be a network path or a download link."
            }
          />
          {requestMessage ? <div className="success-notice">{requestMessage}</div> : null}
          <form className="form-grid" onSubmit={onCreateTask}>
            <Field label="Task Title">
              <input
                value={taskDraft.title}
                onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Example: Prepare weekly report"
                required
              />
            </Field>
            <Field label="Project">
              <select
                value={taskDraft.projectId}
                onChange={(event) => setTaskDraft((current) => ({ ...current, projectId: event.target.value }))}
              >
                {projects.map((project) => (
                  <option value={project.id} key={project.id}>
                    {project.id} - {project.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignee">
              <select
                value={taskDraft.assigneeId}
                onChange={(event) =>
                  setTaskDraft((current) => ({ ...current, assigneeId: event.target.value }))
                }
              >
                {employees.map((employee) => (
                  <option value={employee.id} key={employee.id}>
                    {employee.name} - {employee.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={taskDraft.status}
                onChange={(event) => setTaskDraft((current) => ({ ...current, status: event.target.value }))}
              >
                {taskStatuses.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Progress">
              <input
                type="number"
                min="0"
                max="100"
                value={taskDraft.progress}
                onChange={(event) => setTaskDraft((current) => ({ ...current, progress: event.target.value }))}
              />
            </Field>
            <Field label="Priority">
              <select
                value={taskDraft.priority}
                onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value }))}
              >
                {priorities.map((priority) => (
                  <option value={priority} key={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Start Date">
              <input
                type="date"
                value={taskDraft.start}
                onChange={(event) => setTaskDraft((current) => ({ ...current, start: event.target.value }))}
              />
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={taskDraft.end}
                onChange={(event) => setTaskDraft((current) => ({ ...current, end: event.target.value }))}
              />
            </Field>
            <Field label="Data Reference Type">
              <select
                value={taskDraft.dataRefType}
                onChange={(event) =>
                  setTaskDraft((current) => ({ ...current, dataRefType: event.target.value }))
                }
              >
                {dataTypes.map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data Path / Link">
              <input
                value={taskDraft.dataRefValue}
                onChange={(event) =>
                  setTaskDraft((current) => ({ ...current, dataRefValue: event.target.value }))
                }
                placeholder="\\\\server\\project\\folder or drive link"
              />
            </Field>
            <Field label="Notes">
              <textarea
                value={taskDraft.notes}
                onChange={(event) => setTaskDraft((current) => ({ ...current, notes: event.target.value }))}
              />
            </Field>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                <Save size={17} aria-hidden="true" />
                {canCreateTaskRequests && !canManageTasks ? "Submit Task Request" : "Create Task"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head-row">
          <SectionTitle
            icon={ListChecks}
            title={
              canManageTasks
                ? currentUser?.role === ROLES.TEAM_LEAD
                  ? "Team Tasks"
                  : "All Tasks"
                : isPersonalTaskView
                  ? "My Tasks"
                  : "Monitored Tasks"
            }
            helper={
              canManageTasks
                ? currentUser?.role === ROLES.TEAM_LEAD
                  ? "All tasks across your projects. Review submissions arrive in the Review Queue."
                  : "Inline edits sync live to the shared team workspace."
                : canCreateTaskRequests
                  ? "Approved work and your submitted requests are visible here."
                  : isPersonalTaskView
                    ? "Update your work, then submit it to your Team Lead for QC review."
                    : "Read-only monitoring access to visible work and approval requests."
            }
          />
          <ExportBar
            onExportCsv={
              tasks.length
                ? () => onExport(() => exportTasksCsv(tasks, projects, employees), "Exporting tasks")
                : undefined
            }
            csvLabel="Export CSV"
            onPrint={printReport}
          />
        </div>
        <TaskTable
          tasks={tasks}
          projects={projects}
          employees={employees}
          onUpdateTask={onUpdateTask}
          readOnly={!canEditVisibleTasks}
          currentUser={currentUser}
          canSubmitTaskReview={canSubmitTaskReview}
          canCompleteTasksDirectly={canCompleteTasksDirectly}
          canManageTaskStructure={canManageTasks}
          canDeleteTasks={canDeleteTasks}
          onDeleteTask={onDeleteTask}
          onSubmitTaskReview={onSubmitTaskReview}
          isTaskLocked={isTaskLocked}
        />
        <AdvancedTaskPanel
          tasks={tasks}
          projects={projects}
          onUpdateTask={onUpdateTask}
          canEdit={canEditVisibleTasks}
        />
      </section>
    </div>
  );
}

function AdvancedTaskPanel({ tasks, projects, onUpdateTask, canEdit }) {
  const [selectedTaskId, setSelectedTaskId] = useState(() => String(tasks[0]?.id || ""));
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [dependencyId, setDependencyId] = useState("");
  const [attachmentDraft, setAttachmentDraft] = useState({ title: "", url: "" });
  const selectedTask =
    tasks.find((task) => String(task.id) === String(selectedTaskId)) ||
    tasks[0];

  if (!tasks.length) return null;

  const subtasks = selectedTask?.subtasks || [];
  const dependencies = selectedTask?.dependencies || [];
  const attachments = selectedTask?.attachments || [];
  const dependencyTasks = dependencies
    .map((id) => tasks.find((task) => String(task.id) === String(id)))
    .filter(Boolean);
  const blockingDependencies = dependencyTasks.filter((task) => !isTaskComplete(task));
  const relatedTasks = tasks.filter(
    (task) => task.projectId === selectedTask?.projectId && String(task.id) !== String(selectedTask?.id),
  );

  function patchSelectedTask(patch) {
    if (!selectedTask || !canEdit) return;
    onUpdateTask(selectedTask.id, patch);
  }

  function addSubtask() {
    const title = subtaskTitle.trim();
    if (!title) return;
    patchSelectedTask({
      subtasks: [...subtasks, { id: createRecordId("subtask"), title, done: false }],
    });
    setSubtaskTitle("");
  }

  function toggleSubtask(subtaskId) {
    patchSelectedTask({
      subtasks: subtasks.map((item) =>
        item.id === subtaskId ? { ...item, done: !item.done } : item,
      ),
    });
  }

  function removeSubtask(subtaskId) {
    patchSelectedTask({ subtasks: subtasks.filter((item) => item.id !== subtaskId) });
  }

  function addDependency() {
    if (!dependencyId || dependencies.map(String).includes(String(dependencyId))) return;
    patchSelectedTask({ dependencies: [...dependencies, dependencyId] });
    setDependencyId("");
  }

  function removeDependency(id) {
    patchSelectedTask({ dependencies: dependencies.filter((item) => String(item) !== String(id)) });
  }

  function addAttachment() {
    const title = attachmentDraft.title.trim();
    const url = attachmentDraft.url.trim();
    if (!title && !url) return;
    patchSelectedTask({
      attachments: [
        ...attachments,
        {
          id: createRecordId("attch"),
          title: title || "Task attachment",
          url,
          addedAt: new Date().toISOString(),
        },
      ],
    });
    setAttachmentDraft({ title: "", url: "" });
  }

  function removeAttachment(id) {
    patchSelectedTask({ attachments: attachments.filter((item) => item.id !== id) });
  }

  return (
    <div className="advanced-task-panel">
      <div className="panel-head-row">
        <SectionTitle
          icon={ListOrdered}
          title="Advanced Task Controls"
          helper="Subtasks, dependencies, and task attachments for delivery control."
        />
        <select value={String(selectedTask?.id || "")} onChange={(event) => setSelectedTaskId(event.target.value)}>
          {tasks.map((task) => (
            <option value={String(task.id)} key={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </div>

      {selectedTask ? (
        <div className="advanced-task-grid">
          <div className="advanced-task-card">
            <div className="advanced-card-title">
              <strong>Subtasks</strong>
              <Badge tone="neutral">{subtasks.filter((item) => item.done).length}/{subtasks.length}</Badge>
            </div>
            <div className="inline-input-row">
              <input
                value={subtaskTitle}
                disabled={!canEdit}
                onChange={(event) => setSubtaskTitle(event.target.value)}
                placeholder="Add subtask"
              />
              <button className="secondary-button" type="button" disabled={!canEdit} onClick={addSubtask}>
                Add
              </button>
            </div>
            <div className="check-list">
              {subtasks.length ? subtasks.map((subtask) => (
                <label key={subtask.id}>
                  <input
                    type="checkbox"
                    checked={Boolean(subtask.done)}
                    disabled={!canEdit}
                    onChange={() => toggleSubtask(subtask.id)}
                  />
                  <span>{subtask.title}</span>
                  {canEdit ? (
                    <button type="button" onClick={() => removeSubtask(subtask.id)} aria-label={`Remove ${subtask.title}`}>
                      <X size={14} aria-hidden="true" />
                    </button>
                  ) : null}
                </label>
              )) : <span className="muted">No subtasks yet.</span>}
            </div>
          </div>

          <div className="advanced-task-card">
            <div className="advanced-card-title">
              <strong>Dependencies</strong>
              {blockingDependencies.length ? (
                <Badge tone="danger">{blockingDependencies.length} blocking</Badge>
              ) : (
                <Badge tone="success">Clear</Badge>
              )}
            </div>
            <div className="inline-input-row">
              <select value={dependencyId} disabled={!canEdit} onChange={(event) => setDependencyId(event.target.value)}>
                <option value="">Select dependency</option>
                {relatedTasks.map((task) => (
                  <option value={String(task.id)} key={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              <button className="secondary-button" type="button" disabled={!canEdit} onClick={addDependency}>
                Link
              </button>
            </div>
            <div className="dependency-list">
              {dependencyTasks.length ? dependencyTasks.map((task) => (
                <div key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <StatusBadge value={task.status} />
                  </div>
                  {canEdit ? (
                    <button className="icon-button" type="button" onClick={() => removeDependency(task.id)} aria-label={`Remove dependency ${task.title}`}>
                      <X size={14} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              )) : <span className="muted">No linked dependencies.</span>}
            </div>
          </div>

          <div className="advanced-task-card">
            <div className="advanced-card-title">
              <strong>Attachments / Data Links</strong>
              <Badge tone="neutral">{attachments.length}</Badge>
            </div>
            <div className="inline-input-row stacked-input-row">
              <input
                value={attachmentDraft.title}
                disabled={!canEdit}
                onChange={(event) => setAttachmentDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Attachment title"
              />
              <input
                value={attachmentDraft.url}
                disabled={!canEdit}
                onChange={(event) => setAttachmentDraft((current) => ({ ...current, url: event.target.value }))}
                placeholder="Path or URL"
              />
              <button className="secondary-button" type="button" disabled={!canEdit} onClick={addAttachment}>
                Add Link
              </button>
            </div>
            <div className="attachment-list">
              {attachments.length ? attachments.map((attachment) => (
                <div key={attachment.id}>
                  <div>
                    <strong>{attachment.title}</strong>
                    <span>{attachment.url || "No URL"}</span>
                  </div>
                  {canEdit ? (
                    <button className="icon-button" type="button" onClick={() => removeAttachment(attachment.id)} aria-label={`Remove ${attachment.title}`}>
                      <X size={14} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              )) : <span className="muted">No task attachments yet.</span>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WorkloadPage({ workload, tasks }) {
  const departments = [...new Set(workload.map((employee) => employee.department))];

  return (
    <div className="stack">
      <section className="panel">
        <SectionTitle icon={Users} title="Team Workload" helper="Availability is based on active task count versus employee capacity." />
        <div className="workload-grid">
          {workload.map((employee) => (
            <div className="workload-card" key={employee.id}>
              <div className="workload-card-top">
                <div>
                  <strong>{employee.name}</strong>
                  <span>{employee.title}</span>
                  <small>{employee.department}</small>
                  <small>{employee.actualRole}</small>
                  <small>{employee.username}</small>
                  <small>{employee.email}</small>
                </div>
                <StatusBadge value={employee.status} />
              </div>
              <ProgressBar value={employee.utilization} />
              <small>
                {employee.activeTasks} active tasks / {employee.capacity} capacity
              </small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={BarChart3} title="Departments" helper={`${tasks.length} tasks distributed across ${departments.length} teams.`} />
        <div className="department-grid">
          {departments.map((department) => {
            const members = workload.filter((employee) => employee.department === department);
            const utilization = Math.round(
              members.reduce((sum, member) => sum + member.utilization, 0) / members.length,
            );
            return (
              <div className="department-card" key={department}>
                <strong>{department}</strong>
                <ProgressBar value={utilization} />
                <span>{members.length} members</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function NewProjectPage({
  projectDraft,
  setProjectDraft,
  linkDraft,
  setLinkDraft,
  onAddProjectLink,
  onCreateProject,
  onToggleTeamMember,
  onRequirementPrefix,
  employees,
}) {
  return (
    <section className="panel">
      <SectionTitle icon={PlusCircle} title="New Project" helper="Create the project record, requirements, data links, and initial team map." />
      <form className="form-grid project-form" onSubmit={onCreateProject}>
        <Field label="Project Name">
          <input
            value={projectDraft.name}
            onChange={(event) => setProjectDraft((current) => ({ ...current, name: event.target.value }))}
            placeholder="Example: City Center Scan to BIM"
            required
          />
        </Field>
        <Field label="Project ID">
          <input
            value={projectDraft.id}
            onChange={(event) => setProjectDraft((current) => ({ ...current, id: event.target.value }))}
          />
        </Field>
        <Field label="Client">
          <input
            value={projectDraft.client}
            onChange={(event) => setProjectDraft((current) => ({ ...current, client: event.target.value }))}
            placeholder="Client name"
          />
        </Field>
        <Field label="Project Manager">
          <select
            value={projectDraft.managerId}
            onChange={(event) =>
              setProjectDraft((current) => ({ ...current, managerId: event.target.value }))
            }
          >
            {employees.map((employee) => (
              <option value={employee.id} key={employee.id}>
                {employee.name} - {employee.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={projectDraft.priority}
            onChange={(event) => setProjectDraft((current) => ({ ...current, priority: event.target.value }))}
          >
            {priorities.map((priority) => (
              <option value={priority} key={priority}>
                {priority}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={projectDraft.status}
            onChange={(event) => setProjectDraft((current) => ({ ...current, status: event.target.value }))}
          >
            {statuses.map((status) => (
              <option value={status} key={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start Date">
          <input
            type="date"
            value={projectDraft.start}
            onChange={(event) => setProjectDraft((current) => ({ ...current, start: event.target.value }))}
          />
        </Field>
        <Field label="End Date">
          <input
            type="date"
            value={projectDraft.end}
            onChange={(event) => setProjectDraft((current) => ({ ...current, end: event.target.value }))}
          />
        </Field>

        <div className="wide-field">
          <div className="format-toolbar" aria-label="Requirement formatting">
            <button type="button" onClick={() => onRequirementPrefix("- ")}>
              <ListChecks size={16} aria-hidden="true" />
              Bullet
            </button>
            <button type="button" onClick={() => onRequirementPrefix("1. ")}>
              <ListOrdered size={16} aria-hidden="true" />
              Number
            </button>
            <button type="button" onClick={() => onRequirementPrefix("[ ] ")}>
              <SquareCheckBig size={16} aria-hidden="true" />
              Checklist
            </button>
            <button type="button" onClick={() => onRequirementPrefix("- ")}>
              <Minus size={16} aria-hidden="true" />
              Dash
            </button>
          </div>
          <Field label="Project Requirements">
            <textarea
              rows="7"
              value={projectDraft.requirements}
              onChange={(event) =>
                setProjectDraft((current) => ({ ...current, requirements: event.target.value }))
              }
              placeholder="- Requirement one"
            />
          </Field>
        </div>

        <div className="wide-field link-builder">
          <div className="inline-fields">
            <Field label="Link Title">
              <input
                value={linkDraft.title}
                onChange={(event) => setLinkDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Client Drive"
              />
            </Field>
            <Field label="Link URL">
              <input
                value={linkDraft.url}
                onChange={(event) => setLinkDraft((current) => ({ ...current, url: event.target.value }))}
                placeholder="drive.google.com"
              />
            </Field>
            <button className="secondary-button add-link-button" type="button" onClick={onAddProjectLink}>
              <Plus size={16} aria-hidden="true" />
              Add Link
            </button>
          </div>
          <DataLinksBar links={projectDraft.dataLinks} />
        </div>

        <div className="wide-field">
          <h3 className="subhead">Initial Team Map</h3>
          <div className="team-picker">
            {employees.map((employee) => (
              <label className="team-option" key={employee.id}>
                <input
                  type="checkbox"
                  checked={projectDraft.team.includes(employee.id)}
                  onChange={() => onToggleTeamMember(employee.id)}
                />
                <span>
                  <strong>{employee.name}</strong>
                  <small>{employee.title}</small>
                  <small>{employee.department}</small>
                  <small>{employee.actualRole}</small>
                  <small>{employee.username}</small>
                  <small>{employee.email}</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions wide-field">
          <button className="primary-button" type="submit">
            <Save size={17} aria-hidden="true" />
            Create Project
          </button>
        </div>
      </form>
    </section>
  );
}
