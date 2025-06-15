
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Calendar as CalendarIcon,
  FileText,
  Tag,
  User,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface DocumentFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedProject: string;
  onProjectChange: (value: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  dateRange: { from?: Date; to?: Date };
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void;
  fileType: string;
  onFileTypeChange: (value: string) => void;
  uploadedBy: string;
  onUploadedByChange: (value: string) => void;
  onClearFilters: () => void;
  projects: Array<{ id: string; name: string }>;
  availableTags: string[];
  uploaders: string[];
}

export function DocumentFilters({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedProject,
  onProjectChange,
  selectedTags,
  onTagsChange,
  dateRange,
  onDateRangeChange,
  fileType,
  onFileTypeChange,
  uploadedBy,
  onUploadedByChange,
  onClearFilters,
  projects,
  availableTags,
  uploaders
}: DocumentFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const categories = [
    'General', 'Contracts', 'Plans', 'Photos', 'Reports', 
    'Permits', 'Invoices', 'Change Orders', 'Safety', 'Forms'
  ];

  const fileTypes = [
    { value: 'pdf', label: 'PDF' },
    { value: 'image', label: 'Images' },
    { value: 'doc', label: 'Documents' },
    { value: 'excel', label: 'Spreadsheets' },
    { value: 'cad', label: 'CAD Files' },
    { value: 'video', label: 'Videos' }
  ];

  const activeFiltersCount = [
    selectedCategory !== 'all',
    selectedProject !== 'all',
    selectedTags.length > 0,
    dateRange.from || dateRange.to,
    fileType !== 'all',
    uploadedBy !== 'all'
  ].filter(Boolean).length;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  Advanced
                  <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search documents, descriptions, tags..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Category
            </label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category.toLowerCase().replace(/\s+/g, '-')}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Project</label>
            <Select value={selectedProject} onValueChange={onProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="general">General</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">File Type</label>
            <Select value={fileType} onValueChange={onFileTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {fileTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleContent className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Range */}
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Date Range
                </label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to, 'LLL dd, y')}`
                        ) : (
                          format(dateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        'Pick a date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={(range) => {
                        onDateRangeChange(range || {});
                        if (range?.from && range?.to) {
                          setCalendarOpen(false);
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Uploaded By */}
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Uploaded By
                </label>
                <Select value={uploadedBy} onValueChange={onUploadedByChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Anyone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Anyone</SelectItem>
                    {uploaders.map((uploader) => (
                      <SelectItem key={uploader} value={uploader}>
                        {uploader}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-opacity-80"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <div className="mt-2">
                  <span className="text-sm text-gray-600">Selected: </span>
                  {selectedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="mr-1">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
