import RoutesView from "../../components/saferoutes/RoutesView";

export default function ResidentSafeRoutes() {
  return (
    <div className="relative h-[calc(100vh-64px)] w-full">
      <RoutesView fullscreen initialCollapsed initialTab="saved" />
    </div>
  );
}
