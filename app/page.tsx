"use client"

import React, { useState } from 'react';
import { Users, Home, AlertCircle, CheckCircle } from 'lucide-react';

// Types and Interfaces
interface RoomCapacities {
  capacity6: number;
  capacity5: number;
  capacity4: number;
  capacity3: number;
  capacity2: number;
  capacity1: number;
}

type GroupType = 'couple' | 'family' | 'men' | 'women';

interface PassengerGroup {
  id: number;
  type: GroupType;
  adults: number;
  boys: number;
  girls: number;
  gender?: 'male' | 'female';
}

interface ProcessedGroup {
  type: string;
  size: number;
  description: string;
  originalSize?: number;
}

interface AllocatedRoom {
  capacity: number;
  occupants: ProcessedGroup[];
  occupancy: number;
}

interface AllocationResult {
  familyRooms: AllocatedRoom[];
  menRooms: AllocatedRoom[];
  womenRooms: AllocatedRoom[];
  unallocated: ProcessedGroup[];
}

const page: React.FC = () => {
  const [rooms, setRooms] = useState<RoomCapacities>({
    capacity6: 0,
    capacity5: 0,
    capacity4: 0,
    capacity3: 0,
    capacity2: 0,
    capacity1: 0
  });

  const [passengers, setPassengers] = useState<PassengerGroup[]>([]);
  const [newGroup, setNewGroup] = useState<PassengerGroup>({
    id: 0,
    type: 'couple',
    adults: 2,
    boys: 0,
    girls: 0,
    gender: 'male'
  });

  const [allocation, setAllocation] = useState<AllocationResult | null>(null);

  const addPassengerGroup = (): void => {
    const group: PassengerGroup = { ...newGroup, id: Date.now() };
    setPassengers([...passengers, group]);
    
    setNewGroup({
      id: 0,
      type: 'couple',
      adults: 2,
      boys: 0,
      girls: 0,
      gender: 'male'
    });
  };

  const removeGroup = (id: number): void => {
    setPassengers(passengers.filter(g => g.id !== id));
  };

  const allocateRooms = (): void => {
    const groups: {
      families: ProcessedGroup[];
      men: ProcessedGroup[];
      women: ProcessedGroup[];
    } = {
      families: [],
      men: [],
      women: []
    };

    passengers.forEach(group => {
      if (group.type === 'couple' || group.type === 'family') {
        const totalMembers = group.adults + group.boys + group.girls;
        groups.families.push({
          type: group.type,
          size: totalMembers,
          originalSize: totalMembers,
          description: `${group.type === 'couple' ? 'زوجان' : 'عائلة'} (${group.adults} بالغ، ${group.boys} ولد، ${group.girls} بنت)`
        });
      } else if (group.type === 'men') {
        for (let i = 0; i < group.adults; i++) {
          groups.men.push({ type: 'single_man', size: 1, description: 'رجل' });
        }
      } else if (group.type === 'women') {
        for (let i = 0; i < group.adults; i++) {
          groups.women.push({ type: 'single_woman', size: 1, description: 'امرأة' });
        }
      }
    });

    const availableRooms: number[] = [
      ...Array(rooms.capacity6).fill(6),
      ...Array(rooms.capacity5).fill(5),
      ...Array(rooms.capacity4).fill(4),
      ...Array(rooms.capacity3).fill(3),
      ...Array(rooms.capacity2).fill(2),
      ...Array(rooms.capacity1).fill(1)
    ].sort((a, b) => b - a);

    const result: AllocationResult = {
      familyRooms: [],
      menRooms: [],
      womenRooms: [],
      unallocated: []
    };

    const familyGroups = [...groups.families].sort((a, b) => b.size - a.size);
    const usedRoomIndices = new Set<number>();

    // Allocate families - can use multiple rooms if needed
    familyGroups.forEach(family => {
      const remainingMembers = family.size;
      const familyRoomsNeeded: number[] = [];
      let membersToAllocate = remainingMembers;
      
      // Find rooms for this family
      while (membersToAllocate > 0) {
        const roomIndex = availableRooms.findIndex((capacity, idx) => 
          !usedRoomIndices.has(idx) && capacity > 0
        );

        if (roomIndex !== -1) {
          const roomCapacity = availableRooms[roomIndex];
          const membersInThisRoom = Math.min(roomCapacity, membersToAllocate);
          
          usedRoomIndices.add(roomIndex);
          result.familyRooms.push({
            capacity: roomCapacity,
            occupants: [{
              ...family,
              size: membersInThisRoom,
              description: `${family.description} (${membersInThisRoom} من ${family.originalSize || family.size})`
            }],
            occupancy: membersInThisRoom
          });
          
          membersToAllocate -= membersInThisRoom;
        } else {
          // No more rooms available
          result.unallocated.push({
            ...family,
            size: membersToAllocate,
            description: `${family.description} - ${membersToAllocate} شخص غير مخصص`
          });
          break;
        }
      }
    });

    const remainingRooms = availableRooms.filter((_, idx) => !usedRoomIndices.has(idx));
    const { allocated: menAllocation, unallocated: unallocatedMen } = 
      packPeople(groups.men, remainingRooms);
    
    result.menRooms = menAllocation;
    result.unallocated.push(...unallocatedMen);

    const menRoomCount = menAllocation.length;
    const availableForWomen = remainingRooms.slice(menRoomCount);

    const { allocated: womenAllocation, unallocated: unallocatedWomen } = 
      packPeople(groups.women, availableForWomen);
    
    result.womenRooms = womenAllocation;
    result.unallocated.push(...unallocatedWomen);

    setAllocation(result);
  };

  const packPeople = (
    people: ProcessedGroup[], 
    availableRooms: number[]
  ): { allocated: AllocatedRoom[]; unallocated: ProcessedGroup[] } => {
    const rooms: AllocatedRoom[] = availableRooms.map(capacity => ({ 
      capacity, 
      occupants: [], 
      occupancy: 0 
    }));
    const unallocated: ProcessedGroup[] = [];

    people.forEach(person => {
      const room = rooms.find(r => r.occupancy < r.capacity);
      if (room) {
        room.occupants.push(person);
        room.occupancy += person.size;
      } else {
        unallocated.push(person);
      }
    });

    return {
      allocated: rooms.filter(r => r.occupants.length > 0),
      unallocated
    };
  };

  const getGroupLabel = (group: PassengerGroup): string => {
    switch(group.type) {
      case 'couple': return `زوجان`;
      case 'family': return `عائلة (${group.adults} بالغ، ${group.boys} ولد، ${group.girls} بنت)`;
      case 'men': return `${group.adults} رجال`;
      case 'women': return `${group.adults} نساء`;
      default: return 'مجموعة';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br text-black from-emerald-50 to-teal-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Home className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl font-bold text-gray-800">نظام توزيع الغرف للعمرة</h1>
          </div>
          <p className="text-gray-600 mb-6">نظام توزيع الغرف المتوافق مع الشريعة الإسلامية</p>

          <div className="bg-emerald-50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-emerald-900">الغرف المتاحة</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {([6, 5, 4, 3, 2, 1] as const).map(capacity => (
                <div key={capacity} className="bg-white rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    غرفة {capacity} أشخاص
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={rooms[`capacity${capacity}` as keyof RoomCapacities]}
                    onChange={(e) => setRooms({
                      ...rooms, 
                      [`capacity${capacity}`]: parseInt(e.target.value) || 0
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-900">إضافة مجموعة معتمرين</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع المجموعة</label>
                <select
                  value={newGroup.type}
                  onChange={(e) => setNewGroup({...newGroup, type: e.target.value as GroupType})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="couple">زوجان (متزوجان)</option>
                  <option value="family">عائلة (والدان + أطفال)</option>
                  <option value="men">مجموعة رجال</option>
                  <option value="women">مجموعة نساء</option>
                </select>
              </div>

              {(newGroup.type === 'men' || newGroup.type === 'women') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">عدد البالغين</label>
                  <input
                    type="number"
                    min="1"
                    value={newGroup.adults}
                    onChange={(e) => setNewGroup({...newGroup, adults: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {newGroup.type === 'family' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">البالغون</label>
                    <input
                      type="number"
                      min="1"
                      value={newGroup.adults}
                      onChange={(e) => setNewGroup({...newGroup, adults: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الأولاد (ذكور)</label>
                    <input
                      type="number"
                      min="0"
                      value={newGroup.boys}
                      onChange={(e) => setNewGroup({...newGroup, boys: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">البنات (إناث)</label>
                    <input
                      type="number"
                      min="0"
                      value={newGroup.girls}
                      onChange={(e) => setNewGroup({...newGroup, girls: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
            <button
              onClick={addPassengerGroup}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              إضافة مجموعة
            </button>
          </div>

          {passengers.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">المعتمرون الحاليون</h2>
              <div className="space-y-2">
                {passengers.map(group => (
                  <div key={group.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-600" />
                      <span className="font-medium">{getGroupLabel(group)}</span>
                    </div>
                    <button
                      onClick={() => removeGroup(group.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={allocateRooms}
            disabled={passengers.length === 0}
            className="w-full bg-emerald-600 text-white px-6 py-4 rounded-lg hover:bg-emerald-700 transition font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            توزيع الغرف
          </button>
        </div>

        {allocation && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">نتائج توزيع الغرف</h2>

            {allocation.familyRooms.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-purple-700 flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  غرف العائلات ({allocation.familyRooms.length})
                </h3>
                <div className="grid gap-3">
                  {allocation.familyRooms.map((room, idx) => (
                    <div key={idx} className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                      <div className="font-semibold text-purple-900 mb-2">
                        غرفة {idx + 1} (السعة: {room.capacity}، المشغول: {room.occupancy})
                      </div>
                      <div className="text-sm text-purple-700">
                        {room.occupants.map((o, i) => o.description).join('، ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allocation.menRooms.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-blue-700 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  غرف الرجال ({allocation.menRooms.length})
                </h3>
                <div className="grid gap-3">
                  {allocation.menRooms.map((room, idx) => (
                    <div key={idx} className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <div className="font-semibold text-blue-900 mb-2">
                        غرفة {idx + 1} (السعة: {room.capacity}، المشغول: {room.occupancy})
                      </div>
                      <div className="text-sm text-blue-700">
                        {room.occupants.length} رجال
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allocation.womenRooms.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-pink-700 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  غرف النساء ({allocation.womenRooms.length})
                </h3>
                <div className="grid gap-3">
                  {allocation.womenRooms.map((room, idx) => (
                    <div key={idx} className="bg-pink-50 border-2 border-pink-200 rounded-lg p-4">
                      <div className="font-semibold text-pink-900 mb-2">
                        غرفة {idx + 1} (السعة: {room.capacity}، المشغول: {room.occupancy})
                      </div>
                      <div className="text-sm text-pink-700">
                        {room.occupants.length} نساء
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allocation.unallocated.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  معتمرون غير مخصصين
                </h3>
                <div className="text-sm text-red-700">
                  {allocation.unallocated.map((p, i) => (
                    <div key={i}>{p.description}</div>
                  ))}
                </div>
                <p className="text-sm text-red-600 mt-2">
                  يرجى إضافة المزيد من الغرف لاستيعاب هؤلاء المعتمرين.
                </p>
              </div>
            )}

            {allocation.unallocated.length === 0 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="text-green-700 font-semibold">
                  تم توزيع جميع المعتمرين بنجاح!
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default page;