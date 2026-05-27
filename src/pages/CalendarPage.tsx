import React, { useState, useEffect } from 'react';
import { matchesService } from '../supabase';
import { Match, LeagueType } from '../types';
import { Card, Badge, Button } from '../components/ui';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, Star, StarOff } from 'lucide-react';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  matches: Match[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function loadMarked(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem('markedMatches') || '[]'));
  } catch { return new Set(); }
}

export const CalendarPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filterLeague, setFilterLeague] = useState<LeagueType | 'all'>('all');
  const [markedIds, setMarkedIds] = useState<Set<string>>(loadMarked);

  useEffect(() => {
    const unsub = matchesService.subscribe(setMatches);
    return unsub;
  }, []);

  const toggleMarked = (id: string) => {
    setMarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('markedMatches', JSON.stringify([...next]));
      return next;
    });
  };

  const getMatchesForDate = (date: Date): Match[] => {
    const filtered = filterLeague === 'all'
      ? matches
      : matches.filter(m => m.homeDivision === filterLeague || m.awayDivision === filterLeague);
    return filtered.filter(m => {
      const md = new Date(m.dateTime);
      return md.getFullYear() === date.getFullYear() && md.getMonth() === date.getMonth() && md.getDate() === date.getDate();
    });
  };

  const getCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false, isToday: false, matches: getMatchesForDate(date) });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true, isToday: date.getTime() === today.getTime(), matches: getMatchesForDate(date) });
    }
    for (let i = 1; days.length < 42; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, isToday: false, matches: getMatchesForDate(date) });
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const selectedDateMatches = selectedDate ? getMatchesForDate(selectedDate) : [];
  const upcoming = matches
    .filter(m => m.status === 'scheduled' && new Date(m.dateTime) >= new Date())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  const hasMarked = (matchIds: Match[]) => matchIds.some(m => markedIds.has(m.id));

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Match Calendar</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-bold">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="mb-3">
              <select
                value={filterLeague}
                onChange={(e) => setFilterLeague(e.target.value as LeagueType | 'all')}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
              >
                <option value="all">All Leagues</option>
                <option value="U14">U14</option>
                <option value="U15-B">U15-B</option>
                <option value="U15-A">U15-A</option>
                <option value="U17-B">U17-B</option>
                <option value="U17-A">U17-A</option>
                <option value="B okrujna">B okrujna</option>
                <option value="A okrujna">A okrujna</option>
                <option value="Elite U14">Elite U14</option>
                <option value="Elite U15">Elite U15</option>
                <option value="Elite U16">Elite U16</option>
                <option value="Elite U17">Elite U17</option>
                <option value="Elite U18">Elite U18</option>
                <option value="3rd Professional">3rd Professional</option>
                <option value="2nd Professional">2nd Professional</option>
                <option value="1st Professional">1st Professional</option>
              </select>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, i) => {
                const marked = hasMarked(day.matches);
                return (
                  <div
                    key={i}
                    onClick={() => { setSelectedDate(day.date); setSelectedMatch(null); }}
                    className={`
                      min-h-[80px] p-2 border rounded-lg cursor-pointer transition-colors
                      ${!day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600' : 'bg-white dark:bg-gray-800'}
                      ${day.isToday ? 'ring-2 ring-green-500' : ''}
                      ${selectedDate?.toDateString() === day.date.toDateString() ? 'bg-green-50 dark:bg-green-900/30 border-green-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                      ${day.matches.length > 0 && !marked ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}
                      ${marked ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
                    `}
                  >
                    <div className="text-sm font-medium flex items-center justify-between gap-1">
                      <span>{day.date.getDate()}</span>
                      {marked && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                    </div>
                    {day.matches.length > 0 && (
                      <div className="mt-1">
                        {day.matches.slice(0, 2).map((match, idx) => (
                          <div key={idx} className={`text-xs rounded px-1 truncate mb-0.5 ${match.status === 'completed' ? 'bg-gray-400 text-white' : 'bg-blue-500 text-white'}`}>
                            {match.homeTeamName} vs {match.awayTeamName}
                          </div>
                        ))}
                        {day.matches.length > 2 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">+{day.matches.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="lg:w-96 space-y-4">
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Select a date'}
            </h3>

            {selectedDate ? (
              selectedDateMatches.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateMatches.map(match => {
                    const isMarked = markedIds.has(match.id);
                    return (
                      <div
                        key={match.id}
                        onClick={() => setSelectedMatch(selectedMatch?.id === match.id ? null : match)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedMatch?.id === match.id ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'hover:border-gray-400 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant={match.homeDivision?.includes('Elite') ? 'warning' : 'info'}>
                            {match.homeDivision}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Badge variant={match.status === 'scheduled' ? 'info' : 'success'}>
                              {match.status}
                            </Badge>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleMarked(match.id); }}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title={isMarked ? 'Unmark' : 'Mark as important'}
                            >
                              {isMarked ? <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> : <StarOff className="w-4 h-4 text-gray-400" />}
                            </button>
                          </div>
                        </div>
                        <p className="font-bold text-lg">
                          {match.homeTeamName} vs {match.awayTeamName}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(match.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {match.location}
                          </span>
                        </div>

                        {selectedMatch?.id === match.id && (
                          <div className="mt-3 pt-3 border-t dark:border-gray-600">
                            <div className="text-sm space-y-1">
                              <p><span className="text-gray-500 dark:text-gray-400">Home:</span> {match.homeTeamName} ({match.homeDivision})</p>
                              <p><span className="text-gray-500 dark:text-gray-400">Away:</span> {match.awayTeamName} ({match.awayDivision})</p>
                              <p><span className="text-gray-500 dark:text-gray-400">Category:</span> {match.category}</p>
                              {match.referees.length > 0 && (
                                <p><span className="text-gray-500 dark:text-gray-400">Referees:</span> {match.referees.map(r => r.refereeName).join(', ')}</p>
                              )}
                              {match.result && (
                                <p className="font-bold text-lg mt-2">
                                  Result: {match.result.homeScore} - {match.result.awayScore}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No matches on this date</p>
              )
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Click on a date to see matches</p>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Upcoming Matches
              {markedIds.size > 0 && (
                <Badge variant="warning">{markedIds.size} marked</Badge>
              )}
            </h3>
            <div className="space-y-2">
              {upcoming.length > 0 ? (
                upcoming.slice(0, 5).map(match => {
                  const isMarked = markedIds.has(match.id);
                  return (
                    <div
                      key={match.id}
                      onClick={() => toggleMarked(match.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                        isMarked ? 'bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-400' : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm">{match.homeTeamName} vs {match.awayTeamName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(match.dateTime).toLocaleDateString()} {new Date(match.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {isMarked ? (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                      ) : (
                        <StarOff className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming matches</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
