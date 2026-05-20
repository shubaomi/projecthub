export function SkeletonLoader({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-stone-900/50 border border-stone-800 rounded-2xl p-5 animate-pulse">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-stone-800 w-12 h-12" />
            <div className="bg-stone-800 w-8 h-8 rounded" />
          </div>
          <div className="bg-stone-800 h-5 w-2/3 rounded mb-2" />
          <div className="bg-stone-800 h-4 w-full rounded mb-3" />
          <div className="flex gap-2 mb-6">
            <div className="bg-stone-800 h-6 w-16 rounded-md" />
            <div className="bg-stone-800 h-6 w-20 rounded-md" />
          </div>
          <div className="pt-4 border-t border-stone-800/50 flex items-center justify-between">
            <div className="bg-stone-800 h-4 w-24 rounded" />
            <div className="flex gap-2">
              <div className="bg-stone-800 w-8 h-8 rounded-lg" />
              <div className="bg-stone-800 w-8 h-8 rounded-lg" />
              <div className="bg-stone-800 w-8 h-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
