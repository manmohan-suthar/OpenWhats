export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Icon size={26} className="text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
        </div>
      )}
      <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{title}</p>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
