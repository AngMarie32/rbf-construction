INSERT INTO esign_templates (name, description, category, is_system, default_fields) VALUES
  ('Subcontractor Lien Waiver (Conditional Progress)', 'Conditional waiver and release upon progress payment for subcontractors.', 'Lien Waiver', true, '[]'::jsonb),
  ('Subcontractor Lien Waiver (Unconditional Progress)', 'Unconditional waiver and release upon progress payment for subcontractors.', 'Lien Waiver', true, '[]'::jsonb),
  ('Subcontractor Lien Waiver (Conditional Final)', 'Conditional waiver and release upon final payment for subcontractors.', 'Lien Waiver', true, '[]'::jsonb),
  ('Subcontractor Lien Waiver (Unconditional Final)', 'Unconditional waiver and release upon final payment for subcontractors.', 'Lien Waiver', true, '[]'::jsonb),
  ('Subcontractor Agreement', 'Standard subcontractor agreement covering scope, schedule, payment, insurance, and indemnification.', 'Contract', true, '[]'::jsonb),
  ('Master Subcontractor Contract', 'Master services agreement for ongoing subcontractor relationships.', 'Contract', true, '[]'::jsonb),
  ('Construction Contract', 'General construction contract between owner and contractor.', 'Contract', true, '[]'::jsonb),
  ('Change Order Authorization', 'Change order authorization with scope and pricing changes.', 'Change Order', true, '[]'::jsonb),
  ('Mutual NDA', 'Mutual non-disclosure agreement.', 'Legal', true, '[]'::jsonb)
ON CONFLICT DO NOTHING;