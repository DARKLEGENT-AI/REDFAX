import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { CalendarEvent } from '../types';
import { api } from '../services/apiService';

// --- Icon Components ---

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);
const ChevronLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
);
const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
);


// --- Main Calendar Page Component ---
interface CalendarPageProps {
  user: { username: string };
  token: string;
}


const CalendarPage: React.FC<CalendarPageProps> = ({ user, token }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNamesFull = useMemo(() => [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ], []);
    
    const monthName = monthNamesFull[month];
    const weekDays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

    const fetchTasks = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const fetchedEvents = await api.getTasks(token);
            setEvents(fetchedEvents);
        } catch (err: any) {
            setError(err.message || 'Не удалось загрузить задачи.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const calendarGridData = useMemo(() => {
        const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7; // Monday is 0
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const grid = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            grid.push({ key: `prev-${i}`, day: null, isCurrentMonth: false, eventCount: 0 });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const eventCount = events.filter(e => e.date === dateStr).length;
            grid.push({
                key: dateStr,
                day: i,
                isCurrentMonth: true,
                eventCount: eventCount
            });
        }
        while (grid.length % 7 !== 0) {
            grid.push({ key: `next-${grid.length}`, day: null, isCurrentMonth: false, eventCount: 0 });
        }
        return grid;
    }, [year, month, events]);

    const selectedDateEvents = useMemo(() => {
        if (!selectedDate) return [];
        return events.filter(e => e.date === selectedDate).sort((a,b) => a.title.localeCompare(b.title));
    }, [selectedDate, events]);


    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const handleDayClick = (dateStr: string) => setSelectedDate(dateStr);
    const handleMonthSelect = (monthIndex: number) => {
        setCurrentDate(new Date(year, monthIndex, 1));
    };
    
    const handleAddTask = async (title: string, description: string) => {
        if (!selectedDate || !title.trim() || !token) return;
        
        try {
            const { id } = await api.addTask(token, {
                title,
                description,
                date: selectedDate,
            });
            
            const newEvent: CalendarEvent = {
                id,
                date: selectedDate,
                title,
                description
            };
            setEvents(prev => [...prev, newEvent]);
            setIsModalOpen(false);
        } catch (err: any) {
            alert(err.message || 'Не удалось добавить задачу.');
            console.error(err);
        }
    };

    const handleDeleteTask = async (eventId: string) => {
        if (!token) return;

        const originalEvents = [...events];
        // Optimistic update
        setEvents(prev => prev.filter(e => e.id !== eventId));

        try {
            await api.deleteTask(token, eventId);
        } catch (err: any) {
            // Revert on error
            setEvents(originalEvents);
            alert(err.message || 'Не удалось удалить задачу.');
            console.error(err);
        }
    }
    
    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-light-primary dark:bg-dark-primary">
                <div className="text-center">
                    <svg className="w-16 h-16 text-soviet-red mx-auto animate-spin" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                    <p className="mt-4 text-xl tracking-wider uppercase text-gray-500 dark:text-gray-400">Загрузка задач...</p>
                </div>
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="flex h-full items-center justify-center bg-light-primary dark:bg-dark-primary p-4">
                <div className="text-center">
                    <h2 className="text-xl text-soviet-red font-bold">Ошибка</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{error}</p>
                    <button
                        onClick={fetchTasks}
                        className="mt-4 bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider rounded-md"
                    >
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary overflow-hidden">
            {/* Calendar & Month Selector Column */}
            <div className="flex-1 flex flex-col items-center p-4 md:p-6 overflow-y-auto">
                {/* Calendar Widget */}
                <div className="w-full max-w-2xl bg-light-secondary dark:bg-dark-secondary rounded-lg shadow-lg dark:shadow-none">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4">
                        <h2 className="text-xl font-bold uppercase tracking-wider text-dark-primary dark:text-light-primary">
                            {monthName} <span className="text-gray-500">{year}</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><ChevronLeftIcon /></button>
                            <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><ChevronRightIcon /></button>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-7 border-t border-gray-200 dark:border-gray-700">
                         {weekDays.map(day => (
                            <div key={day} className="text-center font-bold uppercase text-xs p-2 text-gray-500 dark:text-gray-400 border-l border-b border-gray-200 dark:border-gray-700 first:border-l-0">
                                {day}
                            </div>
                        ))}
                        {calendarGridData.map((cell, index) => (
                            <div
                                key={cell.key}
                                onClick={() => cell.isCurrentMonth && handleDayClick(cell.key)}
                                className={`relative p-2 border-b border-l border-gray-200 dark:border-gray-700 transition-colors ${
                                    index % 7 === 0 ? 'border-l-0' : ''
                                } ${
                                    cell.isCurrentMonth ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800' : 'bg-gray-50 dark:bg-dark-primary/50'
                                } ${selectedDate === cell.key ? 'bg-gray-300 dark:bg-gray-700' : ''}`}
                                style={{minHeight: '56px'}}
                            >
                                {cell.day && (
                                    <span className={`text-sm ${new Date().toISOString().split('T')[0] === cell.key ? 'text-soviet-red font-bold' : 'text-dark-primary dark:text-light-primary'}`}>
                                        {cell.day}
                                    </span>
                                )}
                                {cell.eventCount > 0 && (
                                    <div className="absolute bottom-1 right-1 flex flex-wrap-reverse justify-end gap-0.5">
                                        {Array.from({ length: cell.eventCount }).map((_, i) => (
                                            <div key={i} className="h-1.5 w-1.5 bg-soviet-red rounded-full"></div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                 {/* Month Selector Widget */}
                <div className="w-full max-w-2xl bg-light-secondary dark:bg-dark-secondary rounded-lg shadow-lg dark:shadow-none mt-6 p-4">
                    <h3 className="text-lg font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Выбор месяца</h3>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-4">
                        {monthNamesFull.map((name, index) => (
                            <button
                                key={name}
                                onClick={() => handleMonthSelect(index)}
                                className={`px-3 py-2 rounded-md text-sm font-medium uppercase tracking-wider transition-colors duration-200 whitespace-nowrap ${
                                    month === index
                                    ? 'bg-soviet-red text-white'
                                    : 'text-gray-600 dark:text-gray-300 bg-light-primary dark:bg-dark-primary hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-dark-primary dark:hover:text-white'
                                }`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Task Sidebar */}
            {selectedDate && (
                <div className="w-full md:w-80 lg:w-96 bg-light-secondary dark:bg-dark-secondary flex-shrink-0 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold">
                            Задачи на {new Date(selectedDate.replace(/-/g, '/')).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long'})}
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {selectedDateEvents.length > 0 ? selectedDateEvents.map(event => (
                           <div key={event.id} className="bg-gray-200 dark:bg-gray-700 p-3 rounded-md group">
                               <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-dark-primary dark:text-light-primary">{event.title}</h4>
                                    <button 
                                        onClick={() => handleDeleteTask(event.id)}
                                        className="text-gray-500 hover:text-soviet-red opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                    >
                                        Удалить
                                    </button>
                               </div>
                               <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 whitespace-pre-wrap break-words">{event.description}</p>
                           </div>
                        )) : (
                            <p className="text-gray-500 text-center pt-8">На выбранную дату задач нет.</p>
                        )}
                    </div>
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider flex items-center justify-center rounded-md"
                            >
                            <PlusIcon />
                            <span>Добавить задачу</span>
                        </button>
                    </div>
                </div>
            )}
            
            {/* Add Task Modal */}
            {isModalOpen && selectedDate && (
                <AddTaskModal
                    onClose={() => setIsModalOpen(false)}
                    onAddTask={handleAddTask}
                    dateFormatted={new Date(selectedDate.replace(/-/g, '/')).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'})}
                />
            )}
        </div>
    );
};


// --- Add Task Modal Component ---

interface AddTaskModalProps {
  onClose: () => void;
  onAddTask: (title: string, description: string) => void;
  dateFormatted: string;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onAddTask, dateFormatted }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask(title, description);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-light-secondary dark:bg-dark-secondary p-8 rounded-lg shadow-lg w-full max-w-md border-2 border-soviet-red text-dark-primary dark:text-light-primary">
        <h2 className="text-2xl font-bold mb-2 text-center uppercase tracking-wider">Новая задача</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-6">{dateFormatted}</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 uppercase" htmlFor="task-title">
              Название
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 outline-none rounded-md"
              autoFocus
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 uppercase" htmlFor="task-description">
              Описание
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 outline-none h-24 resize-none rounded-md"
            />
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 uppercase tracking-wider rounded-md"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider rounded-md"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default CalendarPage;