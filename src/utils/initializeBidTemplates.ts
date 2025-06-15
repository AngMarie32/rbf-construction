
import { supabase } from '@/integrations/supabase/client';
import { bidTemplateData } from './bidTemplateData';

export const initializeBidTemplates = async () => {
  try {
    // Check if templates already exist
    const { data: existingTemplates } = await supabase
      .from('bid_templates')
      .select('name');

    const templateNames = existingTemplates?.map(t => t.name) || [];

    // Create Comprehensive Template
    if (!templateNames.includes('Comprehensive Construction Template')) {
      const { data: comprehensiveTemplate, error: templateError1 } = await supabase
        .from('bid_templates')
        .insert({
          name: 'Comprehensive Construction Template',
          description: 'Complete construction template with General Conditions, Site Work, and Building divisions',
          is_default: true
        })
        .select()
        .single();

      if (templateError1) throw templateError1;

      const comprehensiveItems = bidTemplateData["Complete Construction Template"].map(item => ({
        template_id: comprehensiveTemplate.id,
        ...item
      }));

      const { error: itemsError1 } = await supabase
        .from('bid_template_items')
        .insert(comprehensiveItems);

      if (itemsError1) throw itemsError1;
    }

    // Create General Conditions + Site Template
    if (!templateNames.includes('General Conditions + Site Work')) {
      const { data: siteTemplate, error: templateError2 } = await supabase
        .from('bid_templates')
        .insert({
          name: 'General Conditions + Site Work',
          description: 'Template for projects focusing on site preparation and general conditions',
          is_default: false
        })
        .select()
        .single();

      if (templateError2) throw templateError2;

      const siteItems = bidTemplateData["General Conditions & Site Work"].map(item => ({
        template_id: siteTemplate.id,
        ...item
      }));

      const { error: itemsError2 } = await supabase
        .from('bid_template_items')
        .insert(siteItems);

      if (itemsError2) throw itemsError2;
    }

    // Create General Conditions + Building Template
    if (!templateNames.includes('General Conditions + Building')) {
      const { data: buildingTemplate, error: templateError3 } = await supabase
        .from('bid_templates')
        .insert({
          name: 'General Conditions + Building',
          description: 'Template for building construction with general conditions',
          is_default: false
        })
        .select()
        .single();

      if (templateError3) throw templateError3;

      const buildingItems = bidTemplateData["General Conditions & Building"].map(item => ({
        template_id: buildingTemplate.id,
        ...item
      }));

      const { error: itemsError3 } = await supabase
        .from('bid_template_items')
        .insert(buildingItems);

      if (itemsError3) throw itemsError3;
    }

    console.log('Bid templates initialized successfully');
  } catch (error) {
    console.error('Error initializing bid templates:', error);
  }
};
