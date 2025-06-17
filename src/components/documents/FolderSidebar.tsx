
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Folder, FolderOpen, Clock, Star, Archive, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Folder {
  id: string;
  name: string;
  count: number;
  isSelected?: boolean;
  isDeletable?: boolean;
}

interface FolderSidebarProps {
  selectedFolder: string;
  onFolderSelect: (folderId: string) => void;
  documentCount: number;
  onDeleteFolder?: (folderId: string) => void;
}

export function FolderSidebar({ selectedFolder, onFolderSelect, documentCount, onDeleteFolder }: FolderSidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'all', name: 'All Documents', count: documentCount, isDeletable: false },
    { id: 'general', name: 'General', count: 0, isDeletable: false },
    { id: 'contracts', name: 'Contracts', count: 0, isDeletable: true },
    { id: 'plans', name: 'Plans & Drawings', count: 0, isDeletable: true },
    { id: 'photos', name: 'Photos', count: 0, isDeletable: true },
    { id: 'reports', name: 'Reports', count: 0, isDeletable: true },
    { id: 'permits', name: 'Permits & Licenses', count: 0, isDeletable: true },
    { id: 'invoices', name: 'Invoices & Billing', count: 0, isDeletable: true },
    { id: 'change-orders', name: 'Change Orders', count: 0, isDeletable: true },
    { id: 'safety', name: 'Safety Documents', count: 0, isDeletable: true },
    { id: 'forms', name: 'Forms & Templates', count: 0, isDeletable: true },
    { id: 'specifications', name: 'Specifications', count: 0, isDeletable: true },
    { id: 'correspondence', name: 'Correspondence', count: 0, isDeletable: true },
  ]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: Folder = {
        id: newFolderName.toLowerCase().replace(/\s+/g, '-'),
        name: newFolderName,
        count: 0,
        isDeletable: true
      };
      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    if (onDeleteFolder) {
      onDeleteFolder(folderId);
      setFolders(folders.filter(f => f.id !== folderId));
    }
  };

  return (
    <div className="w-80 bg-gray-50 border-r p-4 overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Document Folders</h3>
        <div className="space-y-1">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={cn(
                "flex items-center justify-between p-2 rounded hover:bg-blue-50 transition-colors group",
                selectedFolder === folder.id ? "bg-blue-100 text-blue-700" : "text-gray-700"
              )}
            >
              <div 
                className="flex items-center space-x-2 flex-1 cursor-pointer"
                onClick={() => onFolderSelect(folder.id)}
              >
                {selectedFolder === folder.id ? (
                  <FolderOpen className="w-4 h-4" />
                ) : (
                  <Folder className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{folder.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-xs bg-gray-200 px-2 py-1 rounded-full min-w-[24px] text-center">
                  {folder.count}
                </span>
                {folder.isDeletable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Folder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {showNewFolder ? (
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
              className="text-sm"
            />
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleAddFolder} className="flex-1">
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewFolder(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewFolder(true)}
            className="w-full mt-3 justify-start text-gray-600 hover:text-gray-800 hover:bg-gray-100"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
        )}

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm text-gray-600 hover:text-gray-800"
              onClick={() => onFolderSelect('recent')}
            >
              <Clock className="w-4 h-4 mr-2" />
              Recent Documents
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm text-gray-600 hover:text-gray-800"
              onClick={() => onFolderSelect('favorites')}
            >
              <Star className="w-4 h-4 mr-2" />
              Favorite Documents
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm text-gray-600 hover:text-gray-800"
              onClick={() => onFolderSelect('archived')}
            >
              <Archive className="w-4 h-4 mr-2" />
              Archived Documents
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
