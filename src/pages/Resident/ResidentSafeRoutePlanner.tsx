import RoutesView from '../../components/saferoutes/RoutesView';

export default function ResidentSafeRoutePlanner() {
  return (
    <div className="relative h-full w-full">
      <RoutesView fullscreen initialTab="planner" />
    </div>
  );
}
