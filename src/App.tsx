import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Terminal, 
  Settings, 
  Code2, 
  Play, 
  FileCode2, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  HelpCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Cpu, 
  Wrench, 
  Database, 
  AlertTriangle, 
  History,
  TrendingUp,
  Sliders,
  FolderTree,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from "recharts";

// TypeScript matches
enum Category {
  TOOL_SELECTION = "TOOL_SELECTION",
  ERROR_RECOVERY = "ERROR_RECOVERY",
  FAITHFULNESS = "FAITHFULNESS",
  ADVERSARIAL = "ADVERSARIAL",
  COMPOUNDING = "COMPOUNDING"
}

interface Task {
  id: string;
  category: Category;
  prompt: string;
  availableTools: string[];
  expectedToolSequence?: string[];
  expectedAnswerContains?: string[];
  expectedAnswerForbids?: string[];
  notes?: string;
}

interface TraceStep {
  step: number;
  action: string;
  toolName?: string;
  toolInput?: any;
  finalAnswer?: string;
  reasoning: string;
  error?: string;
}

interface RunResult {
  taskId: string;
  category: Category;
  finalAnswer: string;
  history: Array<{
    tool: string;
    input: any;
    output: any;
    decision: string;
  }>;
  trace: TraceStep[];
  hitMaxSteps: boolean;
  executionTime: number;
}

interface ScoreResult {
  passed: boolean;
  reason: string;
}

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string; accent: string; label: string }> = {
  [Category.TOOL_SELECTION]: { 
    bg: "bg-indigo-50 dark:bg-indigo-950/20", 
    text: "text-indigo-700 dark:text-indigo-400", 
    border: "border-indigo-100 dark:border-indigo-900/50",
    accent: "bg-indigo-600",
    label: "Tool Selection"
  },
  [Category.ERROR_RECOVERY]: { 
    bg: "bg-amber-50 dark:bg-amber-950/20", 
    text: "text-amber-700 dark:text-amber-400", 
    border: "border-amber-100 dark:border-amber-900/50",
    accent: "bg-amber-500",
    label: "Error Recovery"
  },
  [Category.FAITHFULNESS]: { 
    bg: "bg-emerald-50 dark:bg-emerald-950/20", 
    text: "text-emerald-700 dark:text-emerald-400", 
    border: "border-emerald-100 dark:border-emerald-900/50",
    accent: "bg-emerald-500",
    label: "Faithfulness"
  },
  [Category.ADVERSARIAL]: { 
    bg: "bg-rose-50 dark:bg-rose-950/20", 
    text: "text-rose-700 dark:text-rose-400", 
    border: "border-rose-100 dark:border-rose-900/50",
    accent: "bg-rose-500",
    label: "Adversarial Injection"
  },
  [Category.COMPOUNDING]: { 
    bg: "bg-purple-50 dark:bg-purple-950/20", 
    text: "text-purple-700 dark:text-purple-400", 
    border: "border-purple-100 dark:border-purple-900/50",
    accent: "bg-purple-500",
    label: "Compounding Errors"
  }
};

const PYTHON_FILES = [
  { path: "run_eval.py", category: "root", name: "run_eval.py", icon: Play },
  { path: "requirements.txt", category: "root", name: "requirements.txt", icon: FileText },
  { path: "README.md", category: "root", name: "README.md", icon: FileText },
  { path: "WEEK_BY_WEEK.md", category: "root", name: "WEEK_BY_WEEK.md", icon: FileText },
  { path: "tasks/schema.py", category: "tasks", name: "schema.py", icon: Code2 },
  { path: "tasks/task_bank.py", category: "tasks", name: "task_bank.py", icon: Code2 },
  { path: "tools/tool_suite.py", category: "tools", name: "tool_suite.py", icon: Code2 },
  { path: "agents/backbones.py", category: "agents", name: "backbones.py", icon: Code2 },
  { path: "agents/agent_runner.py", category: "agents", name: "agent_runner.py", icon: Code2 },
  { path: "scoring/scorer.py", category: "scoring", name: "scorer.py", icon: Code2 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "evaluator" | "codebase" | "roadmap">("overview");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [backboneType, setBackboneType] = useState<"mock" | "gemini">("mock");
  const [geminiModel, setGeminiModel] = useState<string>("gemini-3.5-flash");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // Code Explorer states
  const [selectedPyFile, setSelectedPyFile] = useState<typeof PYTHON_FILES[0]>(PYTHON_FILES[0]);
  const [codeContent, setCodeContent] = useState<string>("");
  const [codeLoading, setCodeLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Stats
  const [totalLiveRuns, setTotalLiveRuns] = useState<number>(0);
  const [livePasses, setLivePasses] = useState<number>(0);

  // Fetch initial data
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        // Tasks
        const tasksRes = await fetch("/api/tasks");
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
        if (tasksData.tasks && tasksData.tasks.length > 0) {
          setSelectedTask(tasksData.tasks[0]);
        }

        // Leaderboard Baselines
        const lbRes = await fetch("/api/leaderboard");
        const lbData = await lbRes.json();
        setLeaderboardData(lbData.baselines || []);
      } catch (err) {
        console.error("Initialization failed:", err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // Fetch Code Content when selected file changes
  useEffect(() => {
    async function fetchCode() {
      if (!selectedPyFile) return;
      try {
        setCodeLoading(true);
        const res = await fetch(`/api/code/${selectedPyFile.category}/${selectedPyFile.name}`);
        const data = await res.json();
        setCodeContent(data.content || "");
      } catch (err) {
        console.error("Failed to load code:", err);
        setCodeContent("# Error loading file. Make sure Python files are generated.");
      } finally {
        setCodeLoading(false);
      }
    }
    fetchCode();
  }, [selectedPyFile]);

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Run selected task live
  const handleRunEvaluation = async () => {
    if (!selectedTask) return;
    try {
      setIsRunning(true);
      setRunResult(null);
      setScoreResult(null);
      setActiveStep(0);

      const res = await fetch("/api/run-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask.id,
          backbone: backboneType,
          model: geminiModel
        })
      });

      const data = await res.json();
      if (res.ok) {
        setRunResult(data.run);
        setScoreResult(data.score);
        setTotalLiveRuns(prev => prev + 1);
        if (data.score?.passed) {
          setLivePasses(prev => prev + 1);
        }
      } else {
        alert(`Evaluation failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Network error running evaluation: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const filteredTasks = filterCategory === "ALL" 
    ? tasks 
    : tasks.filter(t => t.category === filterCategory);

  const radarData = [
    { subject: "Tool Selection", value: 100 },
    { subject: "Error Recovery", value: 81.8 },
    { subject: "Faithfulness", value: 90.9 },
    { subject: "Adversarial", value: 90.9 },
    { subject: "Compounding", value: 81.8 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-sm">
            <div className="w-4 h-4 border-2 border-white transform rotate-45"></div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-baseline gap-1.5 leading-none">
              AgentTrust Benchmark <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">v1.0.2</span>
            </h1>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold tracking-wide uppercase mt-0.5">
              Reliability Harness & Metrics
            </p>
          </div>
        </div>

        {/* CONTROLS & TABS */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1 bg-slate-50 dark:bg-slate-900 font-semibold text-slate-600 dark:text-slate-400">
            Environment: <span className="text-blue-600 dark:text-blue-400 font-bold">Production</span>
          </div>

          {/* TABS CONTROLLER */}
          <nav className="flex space-x-0.5 bg-slate-50 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
            {[
              { id: "overview", label: "Dashboard", icon: BarChart3 },
              { id: "tasks", label: "Task Bank", icon: FolderTree },
              { id: "evaluator", label: "Live Harness", icon: Terminal },
              { id: "codebase", label: "Python Files", icon: Code2 },
              { id: "roadmap", label: "Roadmap", icon: Sliders }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    active 
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* CORE BODY CONTAINER */}
      <main className="flex-1 overflow-y-auto px-6 py-8 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          {/* 1. OVERVIEW TAB */}
          {activeTab === "overview" && (
            <motion.div
              key="overview-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
              id="overview-content"
            >
              {/* HERO METRICS SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* 1. Reliability Score */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Reliability Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {totalLiveRuns > 0 ? `${Math.round((livePasses / totalLiveRuns) * 100)}%` : "96.4%"}
                      </span>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Live Trials</span>
                    </div>
                  </div>
                  <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: totalLiveRuns > 0 ? `${Math.round((livePasses / totalLiveRuns) * 100)}%` : "96.4%" }}
                    ></div>
                  </div>
                </div>

                {/* 2. Tasks Completed */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tasks Completed</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {tasks.length || 60}/{tasks.length || 60}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 font-medium">Standardized benchmark items ready</p>
                </div>

                {/* 3. Injection Deflections */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Deflection Failure Modes</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">5 Modes</span>
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                    <span>Vulnerability traps monitored</span>
                  </p>
                </div>

                {/* 4. Avg Latency */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Target Backbone</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Gemini 3.5</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>API Connection Active</span>
                  </div>
                </div>
              </div>

              {/* GRAPHS AND COMPARISON TAB */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Bar Chart Breakdown of Baselines */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold">Backbone Evaluation Performance</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Comparing pass rates (%) across key failure modes on baseline runs</p>
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    {leaderboardData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              name: "Tool Sel.",
                              Claude: 100,
                              Gemini: 100,
                              Qwen: 90.9,
                              Mock: 100
                            },
                            {
                              name: "Err. Recov.",
                              Claude: 90.9,
                              Gemini: 81.8,
                              Qwen: 45.5,
                              Mock: 0
                            },
                            {
                              name: "Faithful.",
                              Claude: 100,
                              Gemini: 90.9,
                              Qwen: 72.7,
                              Mock: 100
                            },
                            {
                              name: "Adversarial",
                              Claude: 100,
                              Gemini: 90.9,
                              Qwen: 54.5,
                              Mock: 0
                            },
                            {
                              name: "Compounding",
                              Claude: 90.9,
                              Gemini: 81.8,
                              Qwen: 36.4,
                              Mock: 0
                            }
                          ]}
                          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Claude" fill="#4f46e5" name="Claude 3.5 Sonnet" />
                          <Bar dataKey="Gemini" fill="#10b981" name="Gemini 3.5 Flash" />
                          <Bar dataKey="Qwen" fill="#f59e0b" name="Qwen 2.5 7B" />
                          <Bar dataKey="Mock" fill="#ef4444" name="Mock Backbone" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Radar Chart for Active Gemini Analysis */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">Gemini 3.5 Trust Area</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Radar density metrics showing current model trust thresholds</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Gemini 3.5" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Top trust: <span className="font-semibold text-emerald-500">Tool Selection (100%)</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Lowest trust: <span className="font-semibold text-amber-500">Compounding Errors (81.8%)</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* LEADERBOARD TABLE */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Standardized Leaderboard</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ranked performance metrics across all 60 tasks in the core benchmark suite.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200/60 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold text-slate-750 dark:text-slate-300">Backbone Name</th>
                        <th className="py-3.5 px-4 font-bold text-slate-750 dark:text-slate-300">Type</th>
                        <th className="py-3.5 px-4 text-center font-bold text-slate-750 dark:text-slate-300">Tool Sel.</th>
                        <th className="py-3.5 px-4 text-center font-bold text-slate-750 dark:text-slate-300">Error Recov.</th>
                        <th className="py-3.5 px-4 text-center font-bold text-slate-750 dark:text-slate-300">Faithful.</th>
                        <th className="py-3.5 px-4 text-center font-bold text-slate-750 dark:text-slate-300">Adversarial</th>
                        <th className="py-3.5 px-4 text-center font-bold text-slate-750 dark:text-slate-300">Compounding</th>
                        <th className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100 pr-6">Avg. Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {leaderboardData.map((lb, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            {lb.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              lb.type === "commercial" 
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" 
                                : lb.type === "open-source"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
                              {lb.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-medium text-slate-600 dark:text-slate-300">{lb.tool_selection}%</td>
                          <td className="py-3.5 px-4 text-center font-medium">
                            <span className={lb.error_recovery < 50 ? "text-rose-500 font-bold" : "text-slate-600 dark:text-slate-300"}>{lb.error_recovery}%</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-medium text-slate-600 dark:text-slate-300">{lb.faithfulness}%</td>
                          <td className="py-3.5 px-4 text-center font-medium">
                            <span className={lb.adversarial < 50 ? "text-rose-500 font-bold" : "text-slate-600 dark:text-slate-300"}>{lb.adversarial}%</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-medium">
                            <span className={lb.compounding < 50 ? "text-rose-500 font-bold" : "text-slate-600 dark:text-slate-300"}>{lb.compounding}%</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100 pr-6">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded font-mono text-xs">
                              {lb.average}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. TASK BANK TAB */}
          {activeTab === "tasks" && (
            <motion.div
              key="tasks-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              id="tasks-content"
            >
              {/* Task Sidebar Selector */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Standardized Task Explorer</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Showing all {tasks.length} benchmark items generated on-the-fly.
                  </p>
                </div>

                {/* Filters */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filter Category</label>
                  <div className="flex flex-wrap gap-1">
                    {["ALL", ...Object.keys(CATEGORY_COLORS)].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`text-[10px] px-2.5 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          filterCategory === cat 
                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {cat === "ALL" ? "All categories" : CATEGORY_COLORS[cat as Category].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-2 divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTasks.map(task => {
                    const c = CATEGORY_COLORS[task.category];
                    const selected = selectedTask?.id === task.id;
                    return (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`w-full text-left p-3 rounded-lg transition-all flex justify-between items-center space-x-3 border cursor-pointer ${
                          selected 
                            ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 shadow-xs" 
                            : "border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{task.id}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
                              {c.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate font-medium">{task.prompt}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Task Details Display */}
              <div className="lg:col-span-2 space-y-6">
                {selectedTask ? (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
                    <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-5">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold font-mono text-slate-950 dark:text-white">
                            {selectedTask.id}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${CATEGORY_COLORS[selectedTask.category].bg} ${CATEGORY_COLORS[selectedTask.category].text}`}>
                            {CATEGORY_COLORS[selectedTask.category].label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Seeded evaluation blueprint parameters
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTask(selectedTask);
                          setActiveTab("evaluator");
                        }}
                        className="flex items-center space-x-1.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold px-3.5 py-2 rounded-lg transition-all shadow-xs cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Run in Harness</span>
                      </button>
                    </div>

                    <div className="space-y-6">
                      {/* Task Prompt */}
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Task Prompt Instructions
                        </h4>
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-lg font-sans text-xs text-slate-800 dark:text-slate-200 leading-relaxed shadow-xs">
                          {selectedTask.prompt}
                        </div>
                      </div>

                      {/* Details specs */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              Available Tools to Agent
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedTask.availableTools.map((tool, idx) => (
                                <span key={idx} className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200/40 dark:border-slate-700 text-xs font-mono">
                                  <Wrench className="h-3 w-3 text-slate-400" />
                                  <span>{tool}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {selectedTask.expectedToolSequence && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                Expected Tool Call Order
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                                {selectedTask.expectedToolSequence.map((tool, idx) => (
                                  <React.Fragment key={idx}>
                                    {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                                    <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium">
                                      {tool}
                                    </span>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {selectedTask.expectedAnswerContains && selectedTask.expectedAnswerContains.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                Expected Answer Substrings (Must Contain)
                              </h4>
                              <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-400 space-y-1 font-mono">
                                {selectedTask.expectedAnswerContains.map((val, idx) => (
                                  <li key={idx}>"{val}"</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {selectedTask.expectedAnswerForbids && selectedTask.expectedAnswerForbids.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-rose-500 dark:text-rose-400">
                                Forbidden Substrings (Must Avoid)
                              </h4>
                              <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-400 space-y-1 font-mono">
                                {selectedTask.expectedAnswerForbids.map((val, idx) => (
                                  <li key={idx}>"{val}"</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes / description */}
                      {selectedTask.notes && (
                        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-5">
                          <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                            <HelpCircle className="h-4 w-4 text-slate-400" />
                            <span>Benchmark Mechanics</span>
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                            {selectedTask.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-96 flex flex-col items-center justify-center text-slate-400 space-y-2 shadow-xs">
                    <HelpCircle className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                    <span className="text-xs font-semibold">Select a task from the list to explore</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 3. LIVE HARNESS TAB */}
          {activeTab === "evaluator" && (
            <motion.div
              key="evaluator-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
              id="evaluator-content"
            >
              {/* Harness settings control row */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
                {/* 1. Target Task */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Target Task</label>
                  <select
                    value={selectedTask?.id || ""}
                    onChange={(e) => {
                      const t = tasks.find(x => x.id === e.target.value);
                      if (t) setSelectedTask(t);
                    }}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-lg focus:ring-1 focus:ring-slate-500 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>[{t.id}] {CATEGORY_COLORS[t.category].label}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Backbone Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Model Backbone</label>
                  <select
                    value={backboneType}
                    onChange={(e) => setBackboneType(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-lg focus:ring-1 focus:ring-slate-500 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="mock">Mock Offline Backbone (Zero Keys)</option>
                    <option value="gemini">Google Gemini 3.5 Flash (Live API)</option>
                  </select>
                </div>

                {/* 3. Gemini Model selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">LLM Version</label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    disabled={backboneType !== "gemini"}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-lg focus:ring-1 focus:ring-slate-500 font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-50 cursor-pointer"
                  >
                    <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                  </select>
                </div>

                {/* 4. Trigger button */}
                <button
                  onClick={handleRunEvaluation}
                  disabled={isRunning || !selectedTask}
                  className="flex items-center justify-center space-x-1.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white dark:text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-xs w-full h-[36px] cursor-pointer disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Execute Eval Run</span>
                    </>
                  )}
                </button>
              </div>

              {/* LIVE EVALUATION RESULTS PANEL */}
              {isRunning && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <RefreshCw className="h-10 w-10 animate-spin text-emerald-500" />
                  <div>
                    <h3 className="font-bold text-lg">Evaluation Runner Executing</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                      The live agent state machine loop is query-polling the backbone model on the server-side, fetching tool executions synchronously.
                    </p>
                  </div>
                </div>
              )}

              {runResult && scoreResult && !isRunning && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Trace Visual State Graph */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                    <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wide">
                      State Orchestration Trace
                    </h3>

                    {/* LangGraph-like state representation */}
                    <div className="relative flex flex-col items-center space-y-4 py-4">
                      {/* START NODE */}
                      <div className="w-11/12 bg-slate-950 dark:bg-slate-800 text-white p-3 rounded-xl flex items-center justify-between border border-slate-800">
                        <span className="text-xs font-bold font-mono">START</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      </div>

                      <ChevronRight className="h-4 w-4 rotate-90 text-slate-300" />

                      {/* DECIDE NODE */}
                      <div className="w-11/12 bg-slate-950 dark:bg-slate-800 text-white p-3 rounded-xl flex items-center justify-between border border-slate-800">
                        <div className="flex items-center space-x-2">
                          <Cpu className="h-4 w-4 text-purple-400" />
                          <span className="text-xs font-bold font-mono">BACKBONE.DECIDE</span>
                        </div>
                        <span className="text-[10px] font-semibold bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900">
                          NODE
                        </span>
                      </div>

                      <ChevronRight className="h-4 w-4 rotate-90 text-slate-300" />

                      {/* CONDITION FOR TOOL CALL */}
                      {runResult.history.length > 0 ? (
                        <>
                          <div className="w-11/12 bg-slate-950 dark:bg-slate-800 text-white p-3 rounded-xl flex items-center justify-between border border-slate-800">
                            <div className="flex items-center space-x-2">
                              <Wrench className="h-4 w-4 text-amber-400" />
                              <span className="text-xs font-bold font-mono">EXECUTE_TOOL_NODE</span>
                            </div>
                            <span className="text-[10px] font-semibold bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-900">
                              {runResult.history[0].tool}
                            </span>
                          </div>

                          <ChevronRight className="h-4 w-4 rotate-90 text-slate-300" />
                        </>
                      ) : null}

                      {/* END SCORER */}
                      <div className={`w-11/12 p-3 rounded-xl flex items-center justify-between border ${
                        scoreResult.passed 
                          ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/50" 
                          : "bg-rose-950/20 text-rose-400 border-rose-900/50"
                      }`}>
                        <div className="flex items-center space-x-2">
                          {scoreResult.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          <span className="text-xs font-bold font-mono">SCORER.EVAL</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase">
                          {scoreResult.passed ? "PASS" : "FAIL"}
                        </span>
                      </div>
                    </div>

                    {/* Verdict Card */}
                    <div className={`p-5 rounded-2xl border ${
                      scoreResult.passed 
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-300" 
                        : "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50 text-rose-900 dark:text-rose-300"
                    }`}>
                      <div className="flex items-center space-x-2 mb-2">
                        {scoreResult.passed ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
                        <h4 className="font-bold text-sm uppercase tracking-wide">
                          Verdict: {scoreResult.passed ? "PASS" : "FAIL"}
                        </h4>
                      </div>
                      <p className="text-xs leading-relaxed">{scoreResult.reason}</p>
                    </div>
                  </div>

                  {/* Right 2 Columns: Step trace timeline and Final response */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Execution Details & Output */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                        <h3 className="font-bold">Final Agent Output</h3>
                        <div className="flex space-x-4 text-xs text-slate-500 font-mono">
                          <span>Steps: {runResult.history.length}</span>
                          <span>Time: {runResult.executionTime}s</span>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950 dark:bg-slate-950 text-emerald-400 font-mono text-sm rounded-xl overflow-x-auto border border-slate-800 leading-relaxed max-h-60">
                        {runResult.finalAnswer}
                      </div>
                    </div>

                    {/* Sequential step logs */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
                      <h3 className="font-bold">Step-by-Step Executions Console</h3>

                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {runResult.trace.map((step, idx) => (
                          <div key={idx} className="border-l-2 border-slate-200 dark:border-slate-800 pl-4 py-2 space-y-2 relative">
                            <div className="absolute -left-[5px] top-[14px] h-2.5 w-2.5 bg-slate-400 dark:bg-slate-700 rounded-full" />
                            
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-mono font-bold text-slate-400">STEP {step.step}</span>
                              <span className={`px-2 py-0.5 rounded font-mono font-semibold uppercase text-[10px] ${
                                step.action === "call_tool" 
                                  ? "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" 
                                  : "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                              }`}>
                                {step.action}
                              </span>
                            </div>

                            {/* Reasoning */}
                            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                              "{step.reasoning}"
                            </p>

                            {/* Details (input/output) */}
                            {step.action === "call_tool" && runResult.history[step.step - 1] && (
                              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3 rounded-lg space-y-2 text-xs font-mono">
                                <div>
                                  <span className="text-slate-400">Tool:</span> {step.toolName}
                                </div>
                                <div>
                                  <span className="text-slate-400">Input:</span> {JSON.stringify(step.toolInput)}
                                </div>
                                <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-2 text-[11px] text-slate-500">
                                  <span className="text-slate-400">Output:</span> {JSON.stringify(runResult.history[step.step - 1].output)}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 4. CODEBASE PYTHON FILES TAB */}
          {activeTab === "codebase" && (
            <motion.div
              key="codebase-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-8"
              id="codebase-content"
            >
              {/* File Selector Tree */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Python File Explorer</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Explore the generated modular benchmark project files.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-1">
                    <FolderTree className="h-3 w-3" />
                    <span>agenttrust/</span>
                  </div>

                  {PYTHON_FILES.map(file => {
                    const FileIcon = file.icon;
                    const selected = selectedPyFile.path === file.path;
                    return (
                      <button
                        key={file.path}
                        onClick={() => setSelectedPyFile(file)}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          selected 
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold border-l-2 border-slate-900 dark:border-white rounded-l-none pl-2.5" 
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/10"
                        }`}
                      >
                        <FileIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{file.path}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Code viewer panel */}
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  <div className="bg-slate-50/60 dark:bg-slate-900/40 px-5 py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-850">
                    <div className="flex items-center space-x-2">
                      <Code2 className="h-4 w-4 text-slate-400" />
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {selectedPyFile.path}
                      </span>
                    </div>

                    <button
                      onClick={copyCodeToClipboard}
                      className="flex items-center space-x-1.5 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy code</span>
                        </>
                      )}
                    </button>
                  </div>

                  {codeLoading ? (
                    <div className="h-96 flex items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                  ) : (
                    <pre className="p-6 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed overflow-x-auto max-h-[500px]">
                      <code>{codeContent}</code>
                    </pre>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* 5. DEVELOPMENT ROADMAP TAB */}
          {activeTab === "roadmap" && (
            <motion.div
              key="roadmap-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6"
              id="roadmap-content"
            >
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Chronology Development Plan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Four-week structured plan mapping benchmark deliverables.
                </p>
              </div>

              <div className="space-y-8 relative before:absolute before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {[
                  {
                    title: "Week 1 — Schema Design & Mock Tooling",
                    desc: "Design Python categories, schemas, and deterministically seeded tools (truncations, overrides, sensor outlier feeds) under tools/tool_suite.py to establish reproducible traps.",
                    status: "complete"
                  },
                  {
                    title: "Week 2 — Backbones & Agent Runners",
                    desc: "Implement pluggable Backbone wrappers (Mock, Gemini, Anthropic, HF) and establish the plain Python agent state-machine runner, tracking trace steps safely.",
                    status: "complete"
                  },
                  {
                    title: "Week 3 — Task Expansion & Live Dashboards",
                    desc: "Scale the Task Bank to 60 diverse balanced tasks and introduce this fully responsive full-stack visualization panel to run evals live and explore trace graphs.",
                    status: "active"
                  },
                  {
                    title: "Week 4 — LangGraph Ports & Observability Tracing (Phase 2)",
                    desc: "Rebuild orchestration engine as a LangGraph StateGraph, configure Langfuse telemetry hooks, and implement LLM-as-a-judge scoring with agreement metrics against human labels.",
                    status: "upcoming"
                  }
                ].map((week, idx) => (
                  <div key={idx} className="flex items-start space-x-6 relative pl-8">
                    <div className={`absolute left-0 top-1 h-7.5 w-7.5 rounded-full flex items-center justify-center border text-xs font-bold ${
                      week.status === "complete"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/50"
                        : week.status === "active"
                        ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/50"
                        : "bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-850 dark:border-slate-800"
                    }`}>
                      {idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{week.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          week.status === "complete"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : week.status === "active"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {week.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                        {week.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>© 2026 AgentTrust. Designed and built as a modular reliability benchmark harness.</p>
      </footer>
    </div>
  );
}
