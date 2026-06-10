export default function PublicJobSkeleton() {
  return (
    <div className="bg-paper rounded-3xl overflow-hidden ring-1 ring-rule animate-shimmer">
      <div className="aspect-[4/3] bg-mist" />
      <div className="p-6 space-y-3">
        <div className="h-3 bg-mist rounded-full w-24" />
        <div className="h-6 bg-mist rounded-full w-4/5" />
        <div className="h-3 bg-mist rounded-full w-1/2" />
        <div className="space-y-1.5 pt-2">
          <div className="h-3 bg-mist rounded-full" />
          <div className="h-3 bg-mist rounded-full w-3/5" />
        </div>
        <div className="h-10 bg-mist rounded-xl mt-4" />
      </div>
    </div>
  )
}
