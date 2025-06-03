
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Folder {
  id: string;
  name: string;
  count: number;
  isSelected?: boolean;
}

interface FolderSidebarProps {
  selectedFolder: string;
  onFolderSelect: (folderId: string) => void;
  documentCount: number;
}

export function FolderSidebar({ selectedFolder, onFolderSelect, documentCount }: FolderSidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'all', name: 'All Documents', count: documentCount },
    { id: 'general', name: 'General', count: 0 },
    { id: 'contracts', name: 'Contracts', count: 0 },
    { id: 'plans', name: 'Plans', count: 0 },
    { id: 'photos', name: 'Photos', count: 0 },
    { id: 'reports', name: 'Reports', count: 0 },
    { id: 'permits', name: 'Permits', count: 0 },
    { id: 'invoices', name: 'Invoices', count: 0 },
    { id: 'change-orders', name: 'Change Orders', count: 0 },
  ]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: Folder = {
        id: newFolderName.toLowerCase().replace(/\s+/g, '-'),
        name: newFolderName,
        count: 0
      };
      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  return (
    <div className="w-80 bg-gray-50 border-r p-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Folders</h3>
        <div className="space-y-1">
          {folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => onFolderSelect(folder.id)}
              className={cn(
                "flex items-center justify-between p-2 rounded cursor-pointer hover:bg-blue-50",
                selectedFolder === folder.id ? "bg-blue-100 text-blue-700" : "text-gray-700"
              )}
            >
              <div className="flex items-center space-x-2">
                {selectedFolder === folder.id ? (
                  <FolderOpen className="w-4 h-4" />
                ) : (
                  <Folder className="w-4 h-4" />
                )}
                <span className="text-sm">{folder.name}</span>
              </div>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                {folder.count}
              </span>
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
              <Button size="sm" onClick={handleAddFolder}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowNewFolder(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewFolder(true)}
            className="w-full mt-3 justify-start text-gray-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
        )}
      </div>
    </div>
  );
}
