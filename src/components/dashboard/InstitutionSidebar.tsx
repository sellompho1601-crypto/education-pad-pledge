import { useState } from "react";
import { GraduationCap, Home, Activity, FileText, BarChart3, Settings, ChevronRight, MessageSquare, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SidebarOption {
  icon: any;
  title: string;
  value: string;
}

const menuItems: SidebarOption[] = [
  { icon: Home, title: "Overview", value: "overview" },
  { icon: Activity, title: "Donations", value: "donations" },
  { icon: MessageSquare, title: "Messages", value: "messages" },
  { icon: FileText, title: "Reports", value: "reports" },
  { icon: BarChart3, title: "Analytics", value: "analytics" },
  { icon: Settings, title: "Profile", value: "profile" },
];

interface InstitutionSidebarProps {
  selected: string;
  onSelect: (value: string) => void;
  pendingCount?: number;
  messageCount?: number;
}

export const InstitutionSidebar = ({ selected, onSelect, pendingCount, messageCount }: InstitutionSidebarProps) => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate('/');
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <motion.nav
      layout
      className="sticky top-0 h-screen shrink-0 border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 flex flex-col"
      style={{
        width: open ? "240px" : "64px",
      }}
    >
      {/* Header Section */}
      <div className="flex-shrink-0">
        <TitleSection open={open} />
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 space-y-1 py-4 overflow-y-auto">
        {menuItems.map((item) => (
          <Option
            key={item.value}
            Icon={item.icon}
            title={item.title}
            selected={selected}
            setSelected={onSelect}
            open={open}
            notifs={
              item.value === "donations" 
                ? pendingCount 
                : item.value === "messages" 
                ? messageCount 
                : undefined
            }
          />
        ))}
      </div>

      {/* Footer Section */}
      <div className="flex-shrink-0 space-y-2">
        {/* Logout Button */}
        <motion.button
          layout
          onClick={handleLogout}
          className="relative flex h-11 w-full items-center rounded-lg transition-all duration-200 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100"
        >
          <motion.div
            layout
            className="grid h-full w-11 place-content-center text-lg"
          >
            <LogOut className="h-5 w-5" />
          </motion.div>
          {open && (
            <motion.span
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-medium"
            >
              Logout
            </motion.span>
          )}
        </motion.button>

        {/* Collapse Toggle */}
        <ToggleClose open={open} setOpen={setOpen} />
      </div>
    </motion.nav>
  );
};

interface OptionProps {
  Icon: any;
  title: string;
  selected: string;
  setSelected: (value: string) => void;
  open: boolean;
  notifs?: number;
}

const Option = ({ Icon, title, selected, setSelected, open, notifs }: OptionProps) => {
  const isSelected = selected === title.toLowerCase();
  
  return (
    <motion.button
      layout
      onClick={() => setSelected(title.toLowerCase())}
      className={`relative flex h-11 w-full items-center rounded-lg transition-all duration-200 group ${
        isSelected 
          ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm" 
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200"
      }`}
    >
      <motion.div
        layout
        className={`grid h-full w-11 place-content-center text-lg transition-colors ${
          isSelected ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
        }`}
      >
        <Icon className="h-5 w-5" />
      </motion.div>
      {open && (
        <motion.span
          layout
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-medium pr-3"
        >
          {title}
        </motion.span>
      )}

      {notifs !== undefined && notifs > 0 && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          style={{ y: "-50%" }}
          transition={{ delay: 0.3, type: "spring" }}
          className={`absolute top-1/2 size-5 rounded-full text-xs text-white flex items-center justify-center font-medium ${
            open ? "right-3" : "right-2"
          } ${
            isSelected ? "bg-blue-500" : "bg-red-500"
          }`}
        >
          {notifs > 9 ? "9+" : notifs}
        </motion.span>
      )}
    </motion.button>
  );
};

const TitleSection = ({ open }: { open: boolean }) => {
  return (
    <div className="border-b border-slate-200 pb-4">
      <div className="flex cursor-pointer items-center justify-between rounded-lg transition-colors hover:bg-slate-100 p-2">
        <div className="flex items-center gap-3">
          <Logo />
          {open && (
            <motion.div
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col"
            >
              <span className="text-sm font-bold text-slate-900">Institution Hub</span>
              <span className="text-xs text-slate-500">PadForward</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const Logo = () => {
  return (
    <motion.div
      layout
      className="grid size-10 shrink-0 place-content-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm"
    >
      <GraduationCap className="h-5 w-5 text-white" />
    </motion.div>
  );
};

const ToggleClose = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
  return (
    <motion.button
      layout
      onClick={() => setOpen(!open)}
      className="flex w-full items-center justify-center rounded-lg transition-all duration-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 p-2 border border-slate-200 hover:border-slate-300"
    >
      <motion.div
        layout
        className="grid size-8 place-content-center"
      >
        <ChevronRight
          className={`transition-transform duration-200 h-4 w-4 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </motion.div>
      {open && (
        <motion.span
          layout
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-medium ml-2"
        >
          Collapse
        </motion.span>
      )}
    </motion.button>
  );
};