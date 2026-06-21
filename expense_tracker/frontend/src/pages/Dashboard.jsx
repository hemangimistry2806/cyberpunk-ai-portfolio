import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { financeService } from '../services/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowRight,
  Plus,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#3d68f8', '#03dac6', '#ffb800', '#ff4b2b', '#7b2cbf', '#240046'];

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_income: 0,
    total_expenses: 0,
    balance: 0,
    categories: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await financeService.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">Loading Dashboard...</div>;

  const chartData = [
    { name: 'Income', amount: stats.total_income },
    { name: 'Expenses', amount: stats.total_expenses },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Financial Overview</h1>
          <p className="text-slate-500 mt-1">Check your spending habits and net worth.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-medium hover:bg-slate-50 transition-all">
            <Filter size={18} />
            Filter
          </button>
          <button className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-primary-500/30 text-sm font-bold hover:bg-primary-600 transition-all">
            <Plus size={18} />
            Add New
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Income', value: stats.total_income, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Total Expenses', value: stats.total_expenses, icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { label: 'Net Balance', value: stats.balance, icon: Wallet, color: 'text-primary-500', bg: 'bg-primary-500/10' },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
          >
            <div>
              <p className="text-sm text-slate-500 font-medium mb-1">{item.label}</p>
              <h3 className="text-2xl font-bold">${item.value.toLocaleString()}</h3>
            </div>
            <div className={`p-4 ${item.bg} ${item.color} rounded-2xl`}>
              <item.icon size={24} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Comparison Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
          <h3 className="text-xl font-bold mb-6">Income vs Expenses</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415520" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3d68f8' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
          <h3 className="text-xl font-bold mb-6">Spending by Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="amount"
                  nameKey="category"
                >
                  {stats.categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
