import TrainingCalendar from '../components/TrainingCalendar'

export default function Calendar() {
  return (
    <div className="space-y-4 pb-4 fade-in">
      <div>
        <p className="text-sm text-muted">Your training</p>
        <h1 className="text-2xl font-extrabold">Calendar</h1>
      </div>

      <TrainingCalendar />
    </div>
  )
}
