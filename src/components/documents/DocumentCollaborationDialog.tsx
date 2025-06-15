
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Mail, MessageSquare, Clock, X } from 'lucide-react';
import { format } from 'date-fns';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  addedAt: Date;
  lastAccess?: Date;
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
  resolved: boolean;
}

interface Activity {
  id: string;
  user: string;
  action: string;
  timestamp: Date;
}

interface DocumentCollaborationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  collaborators: Collaborator[];
  comments: Comment[];
  activities: Activity[];
  onAddCollaborator: (email: string, role: string) => void;
  onRemoveCollaborator: (collaboratorId: string) => void;
  onUpdateRole: (collaboratorId: string, role: string) => void;
  onAddComment: (content: string) => void;
  onResolveComment: (commentId: string) => void;
}

export function DocumentCollaborationDialog({
  open,
  onOpenChange,
  documentName,
  collaborators,
  comments,
  activities,
  onAddCollaborator,
  onRemoveCollaborator,
  onUpdateRole,
  onAddComment,
  onResolveComment
}: DocumentCollaborationDialogProps) {
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState('viewer');
  const [newComment, setNewComment] = useState('');

  const handleAddCollaborator = () => {
    if (newCollaboratorEmail.trim()) {
      onAddCollaborator(newCollaboratorEmail, newCollaboratorRole);
      setNewCollaboratorEmail('');
      setNewCollaboratorRole('viewer');
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(newComment);
      setNewComment('');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'editor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'commenter': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Collaboration - {documentName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="collaborators" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="collaborators">
              Collaborators ({collaborators.length})
            </TabsTrigger>
            <TabsTrigger value="comments">
              Comments ({comments.filter(c => !c.resolved).length})
            </TabsTrigger>
            <TabsTrigger value="activity">
              Activity ({activities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collaborators" className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Add Collaborator */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Add Collaborator</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email address"
                  value={newCollaboratorEmail}
                  onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={newCollaboratorRole} onValueChange={setNewCollaboratorRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="commenter">Commenter</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddCollaborator}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Collaborators List */}
            <div className="flex-1 overflow-auto space-y-2">
              {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {collaborator.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{collaborator.name}</div>
                      <div className="text-sm text-gray-600">{collaborator.email}</div>
                      {collaborator.lastAccess && (
                        <div className="text-xs text-gray-500">
                          Last access: {format(collaborator.lastAccess, 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor(collaborator.role)}>
                      {collaborator.role}
                    </Badge>
                    {collaborator.role !== 'owner' && (
                      <Select
                        value={collaborator.role}
                        onValueChange={(role) => onUpdateRole(collaborator.id, role)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="commenter">Commenter</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {collaborator.role !== 'owner' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemoveCollaborator(collaborator.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="comments" className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Add Comment */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Add Comment</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <Button onClick={handleAddComment}>
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Comment
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-auto space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className={`p-3 border rounded-lg ${comment.resolved ? 'bg-gray-50' : 'bg-white'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {comment.author.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{comment.author}</span>
                      <span className="text-xs text-gray-500">
                        {format(comment.createdAt, 'MMM dd, yyyy HH:mm')}
                      </span>
                      {comment.resolved && (
                        <Badge variant="outline" className="text-xs">Resolved</Badge>
                      )}
                    </div>
                    {!comment.resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onResolveComment(comment.id)}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}

              {comments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No comments yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-auto space-y-2">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{activity.user}</span>
                  <span className="text-gray-600"> {activity.action}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {format(activity.timestamp, 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            ))}

            {activities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No activity yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
