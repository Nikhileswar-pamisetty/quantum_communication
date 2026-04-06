import { JoinResponse, Message, SendBitResponse } from '../types/chat';
import { TeleportationResult } from '../types/quantum';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private token: string | null = localStorage.getItem('token');
  private currentUsername?: string;
  private currentUserId?: string;
  private roomId?: string;
  private messageHandler?: NodeJS.Timeout;
  private roomHandler?: NodeJS.Timeout;
  private currentStatus: string = 'waiting';

  constructor() {
    this.token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserId = user.id;
        this.currentUsername = user.username;
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
      this.currentUserId = undefined;
      this.currentUsername = undefined;
      localStorage.removeItem('user');
    }
  }

  setUserInfo(id: string, username: string) {
    this.currentUserId = id;
    this.currentUsername = username;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("access_token") || localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        throw new Error("No auth token");
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }
    
    const res = await fetch(url, { ...options, headers });
    if (res.status === 403 || res.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
        throw new Error("Session expired or unauthorized");
    }
    return res;
  }

  async login(username: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    
    localStorage.setItem("access_token", data.access_token);
    // keep old token mapping around so frontend code doesn't break
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user_id", data.user_id);
    localStorage.setItem("username", data.username);
    
    this.token = data.access_token;
    this.currentUserId = data.user_id;
    this.currentUsername = data.username;
    return data;
  }

  async register(username: string, password: string) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if(!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
    }
    return res.json();
  }

  getCurrentUserId() {
    return this.currentUserId;
  }

  async teleportText(receiverId: string, text: string, type: 'direct' | 'group' | 'room', id: string) {
    const payload: any = { receiver_id: receiverId, text_content: text };
    if (type === 'direct') payload.is_direct = true;
    else if (type === 'group') payload.group_id = id;
    else payload.room_id = id;
    
    const res = await this.fetchWithAuth(`${API_BASE_URL}/quantum-text/teleport-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Text teleport failed');
    return res.json();
  }

  async sendDirectMessage(receiverIdOrPayload: any, content?: string, quantumState?: string) {
    const payload = typeof receiverIdOrPayload === 'object' 
        ? receiverIdOrPayload 
        : { receiver_id: receiverIdOrPayload, content, quantum_state: quantumState };
    
    const res = await this.fetchWithAuth(`${API_BASE_URL}/direct/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to send direct message');
    return res.json();
  }

  async getDirectMessages(userId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/direct/messages/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch direct messages');
    return res.json();
  }

  async getConversations() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/direct/conversations`);
    if (!res.ok) throw new Error("Failed to fetch conversations");
    return res.json();
  }

  async searchUsers(query: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/chat/users/search?q=${query}`);
    if (!res.ok) throw new Error("Search failed");
    return res.json();
  }

  async getUserByUsername(username: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/chat/users/username/${username}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error("User not found");
      throw new Error("Failed to fetch user");
    }
    return res.json();
  }

  async getGroups() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/`);
    if (!res.ok) throw new Error('Failed to fetch groups');
    return res.json();
  }

  async createGroup(name: string, participantIds: string[]) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, participant_ids: participantIds })
    });
    if (!res.ok) throw new Error('Failed to create group');
    return res.json();
  }

  async searchGroups(query: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/search?q=${query}`);
    if (!res.ok) throw new Error("Group search failed");
    return res.json();
  }

  async joinGroup(groupId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/${groupId}/join`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to join group");
    return res.json();
  }

  async sendGroupMessage(groupId: string, content: string, quantumState?: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/${groupId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, content, quantum_state: quantumState })
    });
    if (!res.ok) throw new Error('Failed to send group message');
    return res.json();
  }

  async getGroupMessages(groupId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/${groupId}/messages`);
    if (!res.ok) throw new Error('Failed to fetch group messages');
    return res.json();
  }

  async getGroupMembers(groupId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/${groupId}/members`);
    if (!res.ok) throw new Error("Failed to fetch group members");
    return res.json();
  }

  async addMemberToGroup(groupId: string, userId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    if (!res.ok) throw new Error("Failed to add member");
    return res.json();
  }

  async removeMemberFromGroup(groupId: string, userId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/${groupId}/members/${userId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error("Failed to remove member");
    return res.json();
  }

  async deleteGroup(groupId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/${groupId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error("Failed to delete group");
    return res.json();
  }

  async renameGroup(groupId: string, name: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/${groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error("Failed to rename group");
    return res.json();
  }

  async getOnlineUsers() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/chat/users/online`);
    if (!res.ok) throw new Error('Failed to fetch online users');
    return res.json();
  }

  // Deletion Operations
  async deleteDirectMessage(messageId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/direct/messages/${messageId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete message');
    return res.json();
  }

  async deleteGroupMessage(groupId: string, messageId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/groups/${groupId}/messages/${messageId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete message');
    return res.json();
  }

  // Notifications
  async getNotifications() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/notifications/`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  }

  async markNotificationRead(id: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/notifications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true })
    });
    return res.json();
  }

  // Profiles
  async getUserProfile(userId: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/profiles/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  }

  async toggleNoise(enabled: boolean) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/profiles/me/noise-toggle?enabled=${enabled}`, {
      method: 'PUT'
    });
    return res.json();
  }

  // Friends Operations
  async sendFriendRequest(receiverUsername: string) {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_username: receiverUsername })
    });
    if (!res.ok) throw new Error('Failed to send friend request');
    return res.json();
  }

  async getPendingRequests() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/friends/requests`);
    if (!res.ok) throw new Error('Failed to fetch pending requests');
    return res.json();
  }

  async updateFriendRequest(requestId: string, status: 'accepted' | 'rejected') {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/friends/request/${requestId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Failed to ${status} friend request`);
    return res.json();
  }

  async getFriends() {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/friends/`);
    if (!res.ok) throw new Error('Failed to fetch friends');
    return res.json();
  }

  // User Operations
  async joinRoom(username: string): Promise<JoinResponse> {
    try {
      console.log('Joining room with username:', username);

      // Check if user is already in a room
      if (this.currentUsername === username && this.currentUserId && this.roomId) {
        console.log('User already in room, checking current status...');
        // Get current room participants to check status
        const participantsResponse = await this.fetchWithAuth(`${API_BASE_URL}/chat/rooms/${this.roomId}/participants`);
        if (participantsResponse.ok) {
          const participants = await participantsResponse.json();
          console.log('Current room participants:', participants);
          const otherUser = participants.find((p: any) => p.id !== this.currentUserId);
          
          return {
            status: participants.length === 2 ? 'ready' : 'waiting',
            other_user: otherUser?.username
          };
        }
      }

      // Try to create user first
      let userData;
      let userResponse = await this.fetchWithAuth(`${API_BASE_URL}/chat/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          email: `${username}@entangleme.local`
        })
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        // If username exists, fetch the user instead of failing
        if (
          userResponse.status === 400 &&
          errorText.includes("Username already exists")
        ) {
          userData = await this.getUserByUsername(username);
          console.log('Fetched existing user:', userData);
        } else {
          console.error('User creation failed:', userResponse.status, errorText);
          throw new Error(`Failed to create user: ${userResponse.status} ${errorText}`);
        }
      } else {
        userData = await userResponse.json();
        console.log('User created:', userData);
      }

      this.currentUserId = userData.id;
      this.currentUsername = username;

      // Use fixed room name for all users
      const FIXED_ROOM_NAME = 'Entangle Room';
      
      // First, try to find the fixed room by name
      let roomData;
      let foundRoom = false;
      
      try {
        // Get all rooms and find the fixed room
        const allRoomsResponse = await this.fetchWithAuth(`${API_BASE_URL}/chat/rooms`);
        if (allRoomsResponse.ok) {
          const allRooms = await allRoomsResponse.json();
          console.log('All rooms:', allRooms);
          
          // Find the fixed room by name
          for (const room of allRooms) {
            if (room.name === FIXED_ROOM_NAME) {
              console.log('Found fixed room:', room);
              roomData = room;
              this.roomId = room.id;
              foundRoom = true;
              break;
            }
          }
        }
      } catch (error) {
        console.log('Could not fetch all rooms:', error);
      }

      // If fixed room doesn't exist, create it
      if (!foundRoom) {
        console.log('Creating fixed room...');
        const createRoomResponse = await this.fetchWithAuth(`${API_BASE_URL}/chat/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: FIXED_ROOM_NAME,
            participant_ids: [this.currentUserId]
          })
        });

        if (!createRoomResponse.ok) {
          const errorText = await createRoomResponse.text();
          console.error('Room creation failed:', createRoomResponse.status, errorText);
          throw new Error(`Failed to create room: ${createRoomResponse.status} ${errorText}`);
        }

        roomData = await createRoomResponse.json();
        console.log('Fixed room created:', roomData);
        this.roomId = roomData.id;
      } else {
        // Add user to the existing fixed room if not already in it
        try {
          const participantsResponse = await this.fetchWithAuth(`${API_BASE_URL}/chat/rooms/${this.roomId}/participants`);
          if (participantsResponse.ok) {
            const participants = await participantsResponse.json();
            const isUserInRoom = participants.some((p: any) => p.id === this.currentUserId);
            
            if (!isUserInRoom) {
              console.log('Adding user to fixed room...');
              // Use the join room endpoint
              const joinResponse = await this.fetchWithAuth(`${API_BASE_URL}/chat/rooms/join`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  room_id: this.roomId,
                  user_id: this.currentUserId
                })
              });

              if (!joinResponse.ok) {
                console.log('Could not join room, but continuing...');
              }
            }
          }
        } catch (error) {
          console.log('Error adding user to room:', error);
        }
      }

      // Get room participants
      const participantsResponse = await this.fetchWithAuth(`${API_BASE_URL}/chat/rooms/${this.roomId}/participants`);
      if (participantsResponse.ok) {
        const participants = await participantsResponse.json();
        console.log('Room participants:', participants);
        const otherUser = participants.find((p: any) => p.id !== this.currentUserId);

        return {
          status: participants.length === 2 ? 'ready' : 'waiting',
          other_user: otherUser?.username
        };
      }

      return {
        status: 'waiting',
        other_user: undefined
      };
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  async leaveRoom(): Promise<void> {
    if (this.currentUserId && this.roomId) {
      try {
        await this.fetchWithAuth(`${API_BASE_URL}/chat/rooms/${this.roomId}/participants/${this.currentUserId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    }
    this.currentUserId = undefined;
    this.currentUsername = undefined;
    this.roomId = undefined;
  }

  // Message Operations
  async sendBit(username: string, bit: 0 | 1): Promise<SendBitResponse> {
    if (!this.currentUserId || !this.roomId) {
      throw new Error('Not in a room');
    }

    try {
      // Get other user in room
      const participantsResponse = await this.fetchWithAuth(`${API_BASE_URL}/chat/rooms/${this.roomId}/participants`);
      const participants = await participantsResponse.json();
      const receiver = participants.find((p: any) => p.id !== this.currentUserId);

      if (!receiver) {
        throw new Error('No receiver found');
      }

      // Perform quantum teleportation
      const teleportResponse = await this.fetchWithAuth(`${API_BASE_URL}/quantum/teleport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: this.currentUserId,
          receiver_id: receiver.id,
          classical_bit: bit,
          room_id: this.roomId,
          message_content: `Teleported bit: ${bit}`
        })
      });

      if (!teleportResponse.ok) {
        const errorText = await teleportResponse.text();
        throw new Error(`Quantum teleportation failed: ${teleportResponse.status} ${errorText}`);
      }

      const teleportResult = await teleportResponse.json();
      
      return { 
        success: teleportResult.success,
        teleportation_result: teleportResult
      };
    } catch (error) {
      console.error('Error sending bit:', error);
      throw error;
    }
  }

  async getMessages(): Promise<Message[]> {
    if (!this.roomId) {
      return [];
    }

    try {
      const response = await this.fetchWithAuth(`${API_BASE_URL}/chat/rooms/${this.roomId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const messages = await response.json();
      return messages.map((msg: any) => ({
        sender: msg.sender_username,
        bit: msg.quantum_state ? parseInt(msg.quantum_state) : 0,
        timestamp: new Date(msg.created_at).toLocaleTimeString('en-IN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        teleportation_result: msg.teleportation_result
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  // Quantum Operations
  async simulateTeleportation(bit: 0 | 1): Promise<TeleportationResult> {
    try {
      const response = await this.fetchWithAuth(`${API_BASE_URL}/quantum/simulate?bit=${bit}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Simulation failed');
      }

      const result = await response.json();
      return {
        success: result.result.success,
        sent_bit: result.result.sent_bit,
        received_bit: result.result.received_bit,
        classical_bits: result.result.classical_bits,
        receiver_state: result.result.receiver_state,
        teleportation_data: result.result.teleportation_data || {
          circuit: result.result.circuit_data || {},
          measurements: result.result.teleportation_data?.measurements || [],
          gates: result.result.teleportation_data?.gates || [],
          steps: result.result.teleportation_data?.steps || []
        },
        success_probability: result.result.success_probability || 1.0,
        measurement_results: result.result.measurement_results || {
          classical_bits: result.result.classical_bits,
          received_bit: result.result.received_bit,
          success: result.result.success
        }
      };
    } catch (error) {
      console.error('Error simulating teleportation:', error);
      throw error;
    }
  }

  async getCircuitVisualization(bit: 0 | 1): Promise<any> {
    try {
      const response = await this.fetchWithAuth(`${API_BASE_URL}/quantum/circuit/${bit}`);
      if (!response.ok) {
        throw new Error('Failed to get circuit visualization');
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting circuit visualization:', error);
      throw error;
    }
  }

  // Start polling for updates
  startPolling(onMessages: (messages: Message[]) => void, onRoomUpdate: (status: string) => void) {
    // Stop any existing polling first
    this.stopPolling();

    const pollMessages = async () => {
      try {
        const messages = await this.getMessages();
        onMessages(messages);
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    };

    const pollRoomStatus = async () => {
      if (this.roomId) {
        try {
          const participantsResponse = await this.fetchWithAuth(`${API_BASE_URL}/chat/rooms/${this.roomId}/participants`);
          if (participantsResponse.ok) {
            const participants = await participantsResponse.json();
            const status = participants.length === 2 ? 'ready' : 'waiting';
            const previousStatus = this.currentStatus;
            this.currentStatus = status;
            
            onRoomUpdate(status);
            
            // Handle message polling based on room status
            if (status === 'ready' && previousStatus !== 'ready') {
              // Room just became ready - start message polling
              console.log('Starting message polling - 2 users in room');
              pollMessages(); // Initial poll
              this.messageHandler = setInterval(pollMessages, 2000);
            } else if (status === 'waiting' && previousStatus === 'ready') {
              // Room just became waiting - stop message polling
              console.log('Stopping message polling - less than 2 users in room');
              if (this.messageHandler) {
                clearInterval(this.messageHandler);
                this.messageHandler = undefined;
              }
            }
          }
        } catch (error) {
          console.error('Error polling room status:', error);
        }
      }
    };

    // Initial poll for room status
    pollRoomStatus();

    // Set up room status polling interval
    this.roomHandler = setInterval(pollRoomStatus, 3000);
  }

  stopPolling() {
    if (this.messageHandler) {
      clearInterval(this.messageHandler);
      this.messageHandler = undefined;
    }
    if (this.roomHandler) {
      clearInterval(this.roomHandler);
      this.roomHandler = undefined;
    }
    this.currentStatus = 'waiting';
  }
}

export const api = new ApiClient();